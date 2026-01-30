-- Migration: 001_entities
-- Entidades (Multi-tenancy) - Base para todo o sistema

-- Tabela de entidades (hierarquia)
CREATE TABLE IF NOT EXISTS entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  completename TEXT,
  parent_id UUID REFERENCES entities(id) ON DELETE SET NULL,
  level INTEGER DEFAULT 0,
  is_recursive BOOLEAN DEFAULT false,

  -- Configurações da entidade (JSON)
  settings JSONB DEFAULT '{}',

  -- Informações de contato
  address TEXT,
  postcode VARCHAR(20),
  town VARCHAR(255),
  state VARCHAR(255),
  country VARCHAR(255),
  website VARCHAR(255),
  phonenumber VARCHAR(50),
  fax VARCHAR(50),
  email VARCHAR(255),

  -- Configurações de email
  admin_email VARCHAR(255),
  from_email VARCHAR(255),
  noreply_email VARCHAR(255),
  replyto_email VARCHAR(255),
  notification_subject_tag VARCHAR(100),
  mailing_signature TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_entities_parent ON entities(parent_id);
CREATE INDEX IF NOT EXISTS idx_entities_level ON entities(level);
CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_entities_updated_at
  BEFORE UPDATE ON entities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função para calcular completename
CREATE OR REPLACE FUNCTION calculate_entity_completename()
RETURNS TRIGGER AS $$
DECLARE
  parent_completename TEXT;
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.completename := NEW.name;
    NEW.level := 0;
  ELSE
    SELECT completename, level + 1
    INTO parent_completename, NEW.level
    FROM entities
    WHERE id = NEW.parent_id;

    NEW.completename := parent_completename || ' > ' || NEW.name;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_entities_completename
  BEFORE INSERT OR UPDATE ON entities
  FOR EACH ROW
  EXECUTE FUNCTION calculate_entity_completename();

-- Entidade raiz padrão
INSERT INTO entities (id, name, completename, level)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Entidade Raiz',
  'Entidade Raiz',
  0
) ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE entities IS 'Entidades para multi-tenancy - estrutura hierárquica';
COMMENT ON COLUMN entities.completename IS 'Nome completo com hierarquia (ex: Raiz > Filial > Departamento)';
COMMENT ON COLUMN entities.is_recursive IS 'Se true, permissões se aplicam a sub-entidades';
