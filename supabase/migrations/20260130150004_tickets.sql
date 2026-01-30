-- Migration: 004_tickets
-- Sistema de Tickets (Service Desk)

-- Categorias ITIL
CREATE TABLE IF NOT EXISTS itil_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  completename TEXT,
  comment TEXT,

  -- Hierarquia
  parent_id UUID REFERENCES itil_categories(id) ON DELETE SET NULL,
  level INTEGER DEFAULT 0,

  -- Flags
  is_incident BOOLEAN DEFAULT true,
  is_request BOOLEAN DEFAULT true,
  is_problem BOOLEAN DEFAULT true,
  is_change BOOLEAN DEFAULT true,
  is_helpdeskvisible BOOLEAN DEFAULT true,

  -- Templates associados
  tickettemplate_id UUID,
  changetemplate_id UUID,
  problemtemplate_id UUID,

  -- Grupos padrão
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- ID legado
  legacy_id INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_itil_categories_entity ON itil_categories(entity_id);
CREATE INDEX IF NOT EXISTS idx_itil_categories_parent ON itil_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_itil_categories_name ON itil_categories(name);
CREATE INDEX IF NOT EXISTS idx_itil_categories_legacy_id ON itil_categories(legacy_id);

-- Trigger para updated_at e completename
CREATE TRIGGER trigger_itil_categories_updated_at
  BEFORE UPDATE ON itil_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Localizações
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  completename TEXT,
  comment TEXT,

  -- Hierarquia
  parent_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  level INTEGER DEFAULT 0,

  -- Dados
  building TEXT,
  room TEXT,
  address TEXT,
  postcode VARCHAR(20),
  town VARCHAR(255),
  state VARCHAR(255),
  country VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- ID legado
  legacy_id INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_locations_entity ON locations(entity_id);
CREATE INDEX IF NOT EXISTS idx_locations_parent ON locations(parent_id);
CREATE INDEX IF NOT EXISTS idx_locations_name ON locations(name);
CREATE INDEX IF NOT EXISTS idx_locations_legacy_id ON locations(legacy_id);

-- Trigger para updated_at
CREATE TRIGGER trigger_locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Tabela de Tickets
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE NOT NULL,

  -- Identificação
  name TEXT NOT NULL,
  content TEXT,

  -- Status e tipo
  status INTEGER DEFAULT 1 CHECK (status IN (1, 2, 3, 4, 5, 6)),
  -- 1=INCOMING, 2=ASSIGNED, 3=PLANNED, 4=WAITING, 5=SOLVED, 6=CLOSED
  type INTEGER DEFAULT 1 CHECK (type IN (1, 2)),
  -- 1=INCIDENT, 2=REQUEST

  -- Priorização
  urgency INTEGER DEFAULT 3 CHECK (urgency BETWEEN 1 AND 5),
  impact INTEGER DEFAULT 3 CHECK (impact BETWEEN 1 AND 5),
  priority INTEGER GENERATED ALWAYS AS (
    CASE
      WHEN urgency >= 4 AND impact >= 4 THEN 5
      WHEN urgency >= 4 OR impact >= 4 THEN 4
      WHEN urgency >= 3 AND impact >= 3 THEN 3
      WHEN urgency >= 2 OR impact >= 2 THEN 2
      ELSE 1
    END
  ) STORED,

  -- Categorização
  category_id UUID REFERENCES itil_categories(id) ON DELETE SET NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,

  -- Atribuição
  requester_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_group_id UUID REFERENCES groups(id) ON DELETE SET NULL,

  -- SLA
  sla_ttr_id UUID,
  sla_tto_id UUID,
  time_to_resolve TIMESTAMPTZ,
  time_to_own TIMESTAMPTZ,
  internal_time_to_resolve TIMESTAMPTZ,
  internal_time_to_own TIMESTAMPTZ,

  -- Tempo
  actiontime INTEGER DEFAULT 0, -- Tempo total de ação em segundos
  waiting_duration INTEGER DEFAULT 0,
  close_delay_stat INTEGER,
  solve_delay_stat INTEGER,

  -- Validação
  global_validation INTEGER DEFAULT 0, -- 0=NONE, 1=WAITING, 2=ACCEPTED, 3=REFUSED

  -- Soft delete
  is_deleted BOOLEAN DEFAULT false,

  -- ID legado
  legacy_id INTEGER,

  -- Timestamps
  date_creation TIMESTAMPTZ DEFAULT NOW(),
  date_mod TIMESTAMPTZ DEFAULT NOW(),
  solvedate TIMESTAMPTZ,
  closedate TIMESTAMPTZ,
  begin_waiting_date TIMESTAMPTZ,
  takeintoaccountdate TIMESTAMPTZ
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_tickets_entity ON tickets(entity_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_type ON tickets(type);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets(category_id);
CREATE INDEX IF NOT EXISTS idx_tickets_requester ON tickets(requester_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_user ON tickets(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_group ON tickets(assigned_group_id);
CREATE INDEX IF NOT EXISTS idx_tickets_date_creation ON tickets(date_creation DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_is_deleted ON tickets(is_deleted);
CREATE INDEX IF NOT EXISTS idx_tickets_legacy_id ON tickets(legacy_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status_entity ON tickets(status, entity_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION trigger_tickets_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.date_mod = NOW();

  -- Atualizar solvedate quando status muda para SOLVED (5)
  IF NEW.status = 5 AND (OLD.status IS NULL OR OLD.status != 5) THEN
    NEW.solvedate = NOW();
  END IF;

  -- Atualizar closedate quando status muda para CLOSED (6)
  IF NEW.status = 6 AND (OLD.status IS NULL OR OLD.status != 6) THEN
    NEW.closedate = NOW();
  END IF;

  -- Atualizar takeintoaccountdate quando status muda para ASSIGNED (2)
  IF NEW.status >= 2 AND OLD.status = 1 AND NEW.takeintoaccountdate IS NULL THEN
    NEW.takeintoaccountdate = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION trigger_tickets_update();

-- Tabela de usuários relacionados ao ticket
CREATE TABLE IF NOT EXISTS tickets_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type INTEGER NOT NULL CHECK (type IN (1, 2, 3, 4)),
  -- 1=REQUESTER, 2=ASSIGN, 3=OBSERVER, 4=SUPPLIER
  use_notification BOOLEAN DEFAULT true,
  alternative_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(ticket_id, user_id, type)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_tickets_users_ticket ON tickets_users(ticket_id);
CREATE INDEX IF NOT EXISTS idx_tickets_users_user ON tickets_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_users_type ON tickets_users(type);

-- Tabela de grupos relacionados ao ticket
CREATE TABLE IF NOT EXISTS tickets_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  type INTEGER NOT NULL CHECK (type IN (1, 2, 3)),
  -- 1=REQUESTER, 2=ASSIGN, 3=OBSERVER
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(ticket_id, group_id, type)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_tickets_groups_ticket ON tickets_groups(ticket_id);
CREATE INDEX IF NOT EXISTS idx_tickets_groups_group ON tickets_groups(group_id);

-- Tabela de followups (acompanhamentos)
CREATE TABLE IF NOT EXISTS ticket_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_private BOOLEAN DEFAULT false,
  requesttype_id UUID,
  sourceof_item_id UUID,
  sourceitems_id UUID,
  timeline_position INTEGER,
  legacy_id INTEGER,
  date_creation TIMESTAMPTZ DEFAULT NOW(),
  date_mod TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ticket_followups_ticket ON ticket_followups(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_followups_user ON ticket_followups(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_followups_date ON ticket_followups(date_creation DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_followups_legacy_id ON ticket_followups(legacy_id);

-- Trigger para updated_at
CREATE TRIGGER trigger_ticket_followups_updated_at
  BEFORE UPDATE ON ticket_followups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Tabela de tarefas
CREATE TABLE IF NOT EXISTS ticket_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_id_tech UUID REFERENCES profiles(id) ON DELETE SET NULL,
  group_id_tech UUID REFERENCES groups(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  state INTEGER DEFAULT 0 CHECK (state IN (0, 1, 2)),
  -- 0=TODO, 1=INFO, 2=DONE
  actiontime INTEGER DEFAULT 0,
  begin_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  is_private BOOLEAN DEFAULT false,
  taskcategory_id UUID,
  sourceof_item_id UUID,
  sourceitems_id UUID,
  timeline_position INTEGER,
  legacy_id INTEGER,
  date_creation TIMESTAMPTZ DEFAULT NOW(),
  date_mod TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ticket_tasks_ticket ON ticket_tasks(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_tasks_user ON ticket_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_tasks_tech ON ticket_tasks(user_id_tech);
CREATE INDEX IF NOT EXISTS idx_ticket_tasks_state ON ticket_tasks(state);
CREATE INDEX IF NOT EXISTS idx_ticket_tasks_legacy_id ON ticket_tasks(legacy_id);

-- Trigger para updated_at
CREATE TRIGGER trigger_ticket_tasks_updated_at
  BEFORE UPDATE ON ticket_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE tickets IS 'Tickets de suporte - incidentes e requisições';
COMMENT ON TABLE tickets_users IS 'Usuários relacionados ao ticket (requester, assigned, observer)';
COMMENT ON TABLE tickets_groups IS 'Grupos relacionados ao ticket';
COMMENT ON TABLE ticket_followups IS 'Acompanhamentos/comentários do ticket';
COMMENT ON TABLE ticket_tasks IS 'Tarefas do ticket';
