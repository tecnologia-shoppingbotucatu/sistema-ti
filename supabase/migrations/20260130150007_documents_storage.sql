-- Migration: 007_documents_storage
-- Sistema de documentos e storage

-- Categorias de documentos
CREATE TABLE IF NOT EXISTS document_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  completename TEXT,
  comment TEXT,
  parent_id UUID REFERENCES document_categories(id) ON DELETE SET NULL,
  level INTEGER DEFAULT 0,
  legacy_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_categories_entity ON document_categories(entity_id);
CREATE INDEX IF NOT EXISTS idx_document_categories_parent ON document_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_document_categories_legacy_id ON document_categories(legacy_id);

CREATE TRIGGER trigger_document_categories_updated_at
  BEFORE UPDATE ON document_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Tipos de documento (extensões permitidas)
CREATE TABLE IF NOT EXISTS document_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  ext TEXT NOT NULL, -- extensão ou regex
  icon TEXT,
  mime TEXT,
  is_uploadable BOOLEAN DEFAULT true,
  comment TEXT,
  legacy_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_types_ext ON document_types(ext);
CREATE INDEX IF NOT EXISTS idx_document_types_legacy_id ON document_types(legacy_id);

-- Documentos
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  filename TEXT NOT NULL,

  -- Storage
  filepath TEXT NOT NULL, -- Caminho no Supabase Storage
  sha1sum VARCHAR(40), -- Hash para deduplicação
  mime TEXT,
  filesize BIGINT DEFAULT 0,

  -- Classificação
  category_id UUID REFERENCES document_categories(id) ON DELETE SET NULL,
  documenttype_id UUID REFERENCES document_types(id) ON DELETE SET NULL,

  -- Metadados
  comment TEXT,
  link TEXT, -- URL externa (se aplicável)
  tag TEXT,

  -- Ownership
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Flags
  is_deleted BOOLEAN DEFAULT false,
  is_blacklisted BOOLEAN DEFAULT false,

  -- ID legado
  legacy_id INTEGER,

  -- Timestamps
  date_creation TIMESTAMPTZ DEFAULT NOW(),
  date_mod TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_id);
CREATE INDEX IF NOT EXISTS idx_documents_name ON documents(name);
CREATE INDEX IF NOT EXISTS idx_documents_sha1sum ON documents(sha1sum);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category_id);
CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_is_deleted ON documents(is_deleted);
CREATE INDEX IF NOT EXISTS idx_documents_legacy_id ON documents(legacy_id);

CREATE TRIGGER trigger_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Relacionamento documento-item (polimórfico)
CREATE TABLE IF NOT EXISTS documents_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  itemtype TEXT NOT NULL, -- 'Ticket', 'Change', 'Problem', 'Computer', etc.
  item_id UUID NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  timeline_position INTEGER,
  legacy_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_documents_items_document ON documents_items(document_id);
CREATE INDEX IF NOT EXISTS idx_documents_items_item ON documents_items(itemtype, item_id);
CREATE INDEX IF NOT EXISTS idx_documents_items_legacy_id ON documents_items(legacy_id);

-- Tipos de documento padrão
INSERT INTO document_types (name, ext, mime, is_uploadable) VALUES
  ('JPEG Image', 'jpg', 'image/jpeg', true),
  ('JPEG Image', 'jpeg', 'image/jpeg', true),
  ('PNG Image', 'png', 'image/png', true),
  ('GIF Image', 'gif', 'image/gif', true),
  ('PDF Document', 'pdf', 'application/pdf', true),
  ('Word Document', 'doc', 'application/msword', true),
  ('Word Document (OpenXML)', 'docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', true),
  ('Excel Spreadsheet', 'xls', 'application/vnd.ms-excel', true),
  ('Excel Spreadsheet (OpenXML)', 'xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', true),
  ('PowerPoint Presentation', 'ppt', 'application/vnd.ms-powerpoint', true),
  ('PowerPoint Presentation (OpenXML)', 'pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', true),
  ('Text File', 'txt', 'text/plain', true),
  ('CSV File', 'csv', 'text/csv', true),
  ('ZIP Archive', 'zip', 'application/zip', true),
  ('RAR Archive', 'rar', 'application/x-rar-compressed', true),
  ('7-Zip Archive', '7z', 'application/x-7z-compressed', true)
ON CONFLICT (name) DO NOTHING;

-- Tabela de notificações na fila
CREATE TABLE IF NOT EXISTS queued_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- 'ticket_created', 'ticket_updated', etc.
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'error')),

  -- Referência ao item
  itemtype TEXT,
  item_id UUID,

  -- Destinatário
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_email TEXT,

  -- Conteúdo
  subject TEXT,
  body TEXT,
  body_html TEXT,

  -- Agendamento
  send_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,

  -- Erro (se houver)
  error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_queued_notifications_status ON queued_notifications(status);
CREATE INDEX IF NOT EXISTS idx_queued_notifications_send_at ON queued_notifications(send_at);
CREATE INDEX IF NOT EXISTS idx_queued_notifications_recipient ON queued_notifications(recipient_id);

-- Tabela de logs de auditoria
CREATE TABLE IF NOT EXISTS logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itemtype TEXT NOT NULL,
  item_id UUID NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_name TEXT, -- Cache do nome do usuário
  linked_action INTEGER, -- Tipo de ação (ver GLPI Log class)
  old_value TEXT,
  new_value TEXT,
  id_search_option INTEGER, -- Campo alterado
  date_creation TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_logs_item ON logs(itemtype, item_id);
CREATE INDEX IF NOT EXISTS idx_logs_user ON logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_date ON logs(date_creation DESC);
-- Particionamento por data pode ser útil para grandes volumes

-- Configuração do Supabase Storage (criar via Dashboard ou CLI)
-- Buckets:
-- - documents: Documentos privados
-- - avatars: Avatares públicos
-- - temp: Uploads temporários

COMMENT ON TABLE documents IS 'Documentos com metadados - arquivos no Supabase Storage';
COMMENT ON TABLE documents_items IS 'Relacionamento polimórfico documento-item';
COMMENT ON TABLE queued_notifications IS 'Fila de notificações para processamento assíncrono';
COMMENT ON TABLE logs IS 'Log de auditoria de todas as alterações';
COMMENT ON COLUMN documents.filepath IS 'Caminho no Supabase Storage (bucket/path)';
COMMENT ON COLUMN documents.sha1sum IS 'Hash SHA1 do arquivo para deduplicação';
