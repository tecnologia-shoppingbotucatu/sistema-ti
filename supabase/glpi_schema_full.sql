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
-- Migration: 002_auth_profiles
-- Perfis de usuário (extensão de auth.users)

-- Tabela de perfis
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  realname TEXT,
  firstname TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,

  -- Preferências
  language TEXT DEFAULT 'pt_BR',
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  date_format TEXT DEFAULT 'd/m/Y',
  number_format INTEGER DEFAULT 2, -- 1=1 234.56, 2=1.234,56

  -- Entidade padrão
  default_entity_id UUID REFERENCES entities(id) ON DELETE SET NULL,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_deleted BOOLEAN DEFAULT false,

  -- Configurações do usuário (JSON)
  settings JSONB DEFAULT '{}',

  -- Informações adicionais
  title TEXT,
  category TEXT,
  location_id UUID,
  comment TEXT,

  -- Autenticação (para migração do GLPI)
  legacy_id INTEGER, -- ID original do GLPI
  authtype INTEGER DEFAULT 1, -- 1=DB, 3=LDAP, etc

  -- Timestamps
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_default_entity ON profiles(default_entity_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_legacy_id ON profiles(legacy_id);

-- Trigger para updated_at
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função para criar perfil automaticamente ao signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, realname, firstname)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      NEW.raw_user_meta_data->>'preferred_username',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'given_name'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    realname = COALESCE(EXCLUDED.realname, profiles.realname),
    firstname = COALESCE(EXCLUDED.firstname, profiles.firstname);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para novo usuário
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Tabela de grupos
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  completename TEXT,
  comment TEXT,

  -- Hierarquia de grupos
  parent_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  level INTEGER DEFAULT 0,

  -- Flags de funcionalidade
  is_requester BOOLEAN DEFAULT true,
  is_watcher BOOLEAN DEFAULT true,
  is_assign BOOLEAN DEFAULT true,
  is_task BOOLEAN DEFAULT true,
  is_notify BOOLEAN DEFAULT true,
  is_manager BOOLEAN DEFAULT false,

  -- ID legado
  legacy_id INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_groups_entity ON groups(entity_id);
CREATE INDEX IF NOT EXISTS idx_groups_parent ON groups(parent_id);
CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name);
CREATE INDEX IF NOT EXISTS idx_groups_legacy_id ON groups(legacy_id);

-- Trigger para updated_at
CREATE TRIGGER trigger_groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Tabela de membros de grupos
CREATE TABLE IF NOT EXISTS groups_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  is_manager BOOLEAN DEFAULT false,
  is_userdelegate BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(group_id, user_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_groups_users_group ON groups_users(group_id);
CREATE INDEX IF NOT EXISTS idx_groups_users_user ON groups_users(user_id);

COMMENT ON TABLE profiles IS 'Perfis de usuário - extensão de auth.users';
COMMENT ON TABLE groups IS 'Grupos de usuários para atribuição e notificação';
COMMENT ON TABLE groups_users IS 'Membros de grupos';
-- Migration: 003_roles_permissions
-- Sistema de roles e permissões (RBAC)

-- Tabela de roles (antigo glpi_profiles)
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  interface TEXT DEFAULT 'central' CHECK (interface IN ('central', 'helpdesk')),
  comment TEXT,

  -- Permissões (JSONB com bitwise values)
  -- Exemplo: { "ticket": 11, "asset": 1, "user": 2 }
  -- Onde: READ=1, UPDATE=2, CREATE=4, DELETE=8, etc.
  permissions JSONB NOT NULL DEFAULT '{}',

  -- ID legado
  legacy_id INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_roles_interface ON roles(interface);
CREATE INDEX IF NOT EXISTS idx_roles_legacy_id ON roles(legacy_id);

-- Trigger para updated_at
CREATE TRIGGER trigger_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Tabela de vinculação usuário-role-entity
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE NOT NULL,
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE NOT NULL,
  is_recursive BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint
  UNIQUE(user_id, role_id, entity_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_entity ON user_roles(entity_id);

-- Função para obter entidades do usuário (considerando recursividade)
CREATE OR REPLACE FUNCTION get_user_entities(user_uuid UUID)
RETURNS UUID[] AS $$
WITH RECURSIVE user_entities AS (
  -- Entidades diretas do usuário
  SELECT DISTINCT entity_id, is_recursive
  FROM user_roles
  WHERE user_id = user_uuid

  UNION

  -- Sub-entidades quando is_recursive = true
  SELECT e.id, false
  FROM entities e
  INNER JOIN user_entities ue ON e.parent_id = ue.entity_id
  WHERE ue.is_recursive = true
)
SELECT ARRAY_AGG(DISTINCT entity_id)
FROM user_entities;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Função para verificar permissão do usuário
CREATE OR REPLACE FUNCTION check_user_permission(
  user_uuid UUID,
  resource_name TEXT,
  required_right INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  aggregated_permission INTEGER := 0;
  role_record RECORD;
BEGIN
  -- Agregar permissões de todos os roles do usuário
  FOR role_record IN
    SELECT r.permissions
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = user_uuid
  LOOP
    aggregated_permission := aggregated_permission | COALESCE(
      (role_record.permissions->>resource_name)::INTEGER,
      0
    );
  END LOOP;

  -- Verificar se tem o direito usando bitwise AND
  RETURN (aggregated_permission & required_right) > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Roles padrão (como no GLPI)
INSERT INTO roles (id, name, interface, permissions, legacy_id) VALUES
(
  '00000000-0000-0000-0000-000000000001',
  'Super-Admin',
  'central',
  '{
    "ticket": 131071,
    "change": 131071,
    "problem": 131071,
    "computer": 119,
    "monitor": 119,
    "printer": 119,
    "peripheral": 119,
    "phone": 119,
    "networkequipment": 119,
    "software": 119,
    "document": 119,
    "user": 119,
    "group": 119,
    "entity": 119,
    "profile": 119,
    "config": 119,
    "logs": 1,
    "backup": 1
  }',
  1
),
(
  '00000000-0000-0000-0000-000000000002',
  'Admin',
  'central',
  '{
    "ticket": 8319,
    "change": 8319,
    "problem": 8319,
    "computer": 7,
    "monitor": 7,
    "printer": 7,
    "peripheral": 7,
    "phone": 7,
    "networkequipment": 7,
    "software": 7,
    "document": 7,
    "user": 7,
    "group": 7,
    "entity": 1,
    "profile": 1,
    "config": 0,
    "logs": 1,
    "backup": 0
  }',
  2
),
(
  '00000000-0000-0000-0000-000000000003',
  'Technician',
  'central',
  '{
    "ticket": 8319,
    "change": 97,
    "problem": 97,
    "computer": 3,
    "monitor": 3,
    "printer": 3,
    "peripheral": 3,
    "phone": 3,
    "networkequipment": 3,
    "software": 1,
    "document": 7,
    "user": 1,
    "group": 1,
    "entity": 0,
    "profile": 0,
    "config": 0,
    "logs": 0,
    "backup": 0
  }',
  3
),
(
  '00000000-0000-0000-0000-000000000004',
  'Helpdesk',
  'helpdesk',
  '{
    "ticket": 33,
    "change": 0,
    "problem": 0,
    "computer": 1,
    "monitor": 1,
    "printer": 1,
    "peripheral": 1,
    "phone": 1,
    "networkequipment": 0,
    "software": 0,
    "document": 1,
    "user": 0,
    "group": 0,
    "entity": 0,
    "profile": 0,
    "config": 0,
    "logs": 0,
    "backup": 0
  }',
  4
),
(
  '00000000-0000-0000-0000-000000000005',
  'Self-Service',
  'helpdesk',
  '{
    "ticket": 1,
    "change": 0,
    "problem": 0,
    "computer": 0,
    "monitor": 0,
    "printer": 0,
    "peripheral": 0,
    "phone": 0,
    "networkequipment": 0,
    "software": 0,
    "document": 0,
    "user": 0,
    "group": 0,
    "entity": 0,
    "profile": 0,
    "config": 0,
    "logs": 0,
    "backup": 0
  }',
  5
)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE roles IS 'Roles/perfis com permissões - antigo glpi_profiles';
COMMENT ON TABLE user_roles IS 'Vinculação usuário-role-entity';
COMMENT ON COLUMN roles.permissions IS 'Permissões em JSONB com valores bitwise (READ=1, UPDATE=2, CREATE=4, DELETE=8, etc.)';
COMMENT ON COLUMN user_roles.is_recursive IS 'Se true, permissão se aplica a sub-entidades';
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
-- Migration: 005_changes_problems
-- Changes (Mudanças) e Problems (Problemas)

-- Tabela de Changes
CREATE TABLE IF NOT EXISTS changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE NOT NULL,

  -- Identificação
  name TEXT NOT NULL,
  content TEXT,

  -- Status
  status INTEGER DEFAULT 1 CHECK (status BETWEEN 1 AND 10),
  -- 1=NEW, 2=EVALUATION, 3=APPROVAL, 4=TESTING, 5=QUALIFICATION
  -- 6=APPLIED, 7=REVIEW, 8=CLOSED, 9=CANCELED, 10=REFUSED

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

  -- Conteúdo do Change
  impactcontent TEXT,
  controlistcontent TEXT,
  rolloutplancontent TEXT,
  backoutplancontent TEXT,
  checklistcontent TEXT,

  -- Validação
  global_validation INTEGER DEFAULT 0,

  -- Tempo
  actiontime INTEGER DEFAULT 0,
  waiting_duration INTEGER DEFAULT 0,
  close_delay_stat INTEGER,
  solve_delay_stat INTEGER,

  -- Soft delete
  is_deleted BOOLEAN DEFAULT false,

  -- ID legado
  legacy_id INTEGER,

  -- Timestamps
  date_creation TIMESTAMPTZ DEFAULT NOW(),
  date_mod TIMESTAMPTZ DEFAULT NOW(),
  solvedate TIMESTAMPTZ,
  closedate TIMESTAMPTZ,
  begin_waiting_date TIMESTAMPTZ
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_changes_entity ON changes(entity_id);
CREATE INDEX IF NOT EXISTS idx_changes_status ON changes(status);
CREATE INDEX IF NOT EXISTS idx_changes_priority ON changes(priority);
CREATE INDEX IF NOT EXISTS idx_changes_requester ON changes(requester_id);
CREATE INDEX IF NOT EXISTS idx_changes_assigned ON changes(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_changes_date ON changes(date_creation DESC);
CREATE INDEX IF NOT EXISTS idx_changes_is_deleted ON changes(is_deleted);
CREATE INDEX IF NOT EXISTS idx_changes_legacy_id ON changes(legacy_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION trigger_changes_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.date_mod = NOW();

  IF NEW.status = 8 AND (OLD.status IS NULL OR OLD.status != 8) THEN
    NEW.closedate = NOW();
  END IF;

  IF NEW.status = 6 AND (OLD.status IS NULL OR OLD.status != 6) THEN
    NEW.solvedate = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_changes_updated_at
  BEFORE UPDATE ON changes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_changes_update();

-- Usuários do Change
CREATE TABLE IF NOT EXISTS changes_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_id UUID REFERENCES changes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type INTEGER NOT NULL CHECK (type IN (1, 2, 3, 4)),
  use_notification BOOLEAN DEFAULT true,
  alternative_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(change_id, user_id, type)
);

CREATE INDEX IF NOT EXISTS idx_changes_users_change ON changes_users(change_id);
CREATE INDEX IF NOT EXISTS idx_changes_users_user ON changes_users(user_id);

-- Grupos do Change
CREATE TABLE IF NOT EXISTS changes_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_id UUID REFERENCES changes(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  type INTEGER NOT NULL CHECK (type IN (1, 2, 3)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(change_id, group_id, type)
);

CREATE INDEX IF NOT EXISTS idx_changes_groups_change ON changes_groups(change_id);
CREATE INDEX IF NOT EXISTS idx_changes_groups_group ON changes_groups(group_id);

-- Followups do Change
CREATE TABLE IF NOT EXISTS change_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_id UUID REFERENCES changes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_private BOOLEAN DEFAULT false,
  timeline_position INTEGER,
  legacy_id INTEGER,
  date_creation TIMESTAMPTZ DEFAULT NOW(),
  date_mod TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_change_followups_change ON change_followups(change_id);
CREATE INDEX IF NOT EXISTS idx_change_followups_legacy_id ON change_followups(legacy_id);

CREATE TRIGGER trigger_change_followups_updated_at
  BEFORE UPDATE ON change_followups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Tarefas do Change
CREATE TABLE IF NOT EXISTS change_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_id UUID REFERENCES changes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_id_tech UUID REFERENCES profiles(id) ON DELETE SET NULL,
  group_id_tech UUID REFERENCES groups(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  state INTEGER DEFAULT 0 CHECK (state IN (0, 1, 2)),
  actiontime INTEGER DEFAULT 0,
  begin_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  is_private BOOLEAN DEFAULT false,
  timeline_position INTEGER,
  legacy_id INTEGER,
  date_creation TIMESTAMPTZ DEFAULT NOW(),
  date_mod TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_change_tasks_change ON change_tasks(change_id);
CREATE INDEX IF NOT EXISTS idx_change_tasks_legacy_id ON change_tasks(legacy_id);

CREATE TRIGGER trigger_change_tasks_updated_at
  BEFORE UPDATE ON change_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Tabela de Problems
CREATE TABLE IF NOT EXISTS problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE NOT NULL,

  -- Identificação
  name TEXT NOT NULL,
  content TEXT,

  -- Status
  status INTEGER DEFAULT 1 CHECK (status IN (1, 2, 3, 4, 5, 6, 7)),
  -- 1=INCOMING, 2=ASSIGNED, 3=PLANNED, 4=WAITING, 5=SOLVED, 6=CLOSED, 7=OBSERVED

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

  -- Conteúdo do Problem
  impactcontent TEXT,
  causecontent TEXT,
  symptomcontent TEXT,

  -- Tempo
  actiontime INTEGER DEFAULT 0,
  waiting_duration INTEGER DEFAULT 0,
  close_delay_stat INTEGER,
  solve_delay_stat INTEGER,

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
  time_to_resolve TIMESTAMPTZ
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_problems_entity ON problems(entity_id);
CREATE INDEX IF NOT EXISTS idx_problems_status ON problems(status);
CREATE INDEX IF NOT EXISTS idx_problems_priority ON problems(priority);
CREATE INDEX IF NOT EXISTS idx_problems_requester ON problems(requester_id);
CREATE INDEX IF NOT EXISTS idx_problems_assigned ON problems(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_problems_date ON problems(date_creation DESC);
CREATE INDEX IF NOT EXISTS idx_problems_is_deleted ON problems(is_deleted);
CREATE INDEX IF NOT EXISTS idx_problems_legacy_id ON problems(legacy_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION trigger_problems_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.date_mod = NOW();

  IF NEW.status = 6 AND (OLD.status IS NULL OR OLD.status != 6) THEN
    NEW.closedate = NOW();
  END IF;

  IF NEW.status = 5 AND (OLD.status IS NULL OR OLD.status != 5) THEN
    NEW.solvedate = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_problems_updated_at
  BEFORE UPDATE ON problems
  FOR EACH ROW
  EXECUTE FUNCTION trigger_problems_update();

-- Usuários do Problem
CREATE TABLE IF NOT EXISTS problems_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID REFERENCES problems(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type INTEGER NOT NULL CHECK (type IN (1, 2, 3, 4)),
  use_notification BOOLEAN DEFAULT true,
  alternative_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(problem_id, user_id, type)
);

CREATE INDEX IF NOT EXISTS idx_problems_users_problem ON problems_users(problem_id);
CREATE INDEX IF NOT EXISTS idx_problems_users_user ON problems_users(user_id);

-- Grupos do Problem
CREATE TABLE IF NOT EXISTS problems_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID REFERENCES problems(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  type INTEGER NOT NULL CHECK (type IN (1, 2, 3)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(problem_id, group_id, type)
);

CREATE INDEX IF NOT EXISTS idx_problems_groups_problem ON problems_groups(problem_id);
CREATE INDEX IF NOT EXISTS idx_problems_groups_group ON problems_groups(group_id);

-- Followups do Problem
CREATE TABLE IF NOT EXISTS problem_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID REFERENCES problems(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_private BOOLEAN DEFAULT false,
  timeline_position INTEGER,
  legacy_id INTEGER,
  date_creation TIMESTAMPTZ DEFAULT NOW(),
  date_mod TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_problem_followups_problem ON problem_followups(problem_id);
CREATE INDEX IF NOT EXISTS idx_problem_followups_legacy_id ON problem_followups(legacy_id);

CREATE TRIGGER trigger_problem_followups_updated_at
  BEFORE UPDATE ON problem_followups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Tarefas do Problem
CREATE TABLE IF NOT EXISTS problem_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID REFERENCES problems(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_id_tech UUID REFERENCES profiles(id) ON DELETE SET NULL,
  group_id_tech UUID REFERENCES groups(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  state INTEGER DEFAULT 0 CHECK (state IN (0, 1, 2)),
  actiontime INTEGER DEFAULT 0,
  begin_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  is_private BOOLEAN DEFAULT false,
  timeline_position INTEGER,
  legacy_id INTEGER,
  date_creation TIMESTAMPTZ DEFAULT NOW(),
  date_mod TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_problem_tasks_problem ON problem_tasks(problem_id);
CREATE INDEX IF NOT EXISTS idx_problem_tasks_legacy_id ON problem_tasks(legacy_id);

CREATE TRIGGER trigger_problem_tasks_updated_at
  BEFORE UPDATE ON problem_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Relacionamento Ticket-Problem
CREATE TABLE IF NOT EXISTS problems_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID REFERENCES problems(id) ON DELETE CASCADE NOT NULL,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(problem_id, ticket_id)
);

CREATE INDEX IF NOT EXISTS idx_problems_tickets_problem ON problems_tickets(problem_id);
CREATE INDEX IF NOT EXISTS idx_problems_tickets_ticket ON problems_tickets(ticket_id);

-- Relacionamento Change-Ticket
CREATE TABLE IF NOT EXISTS changes_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_id UUID REFERENCES changes(id) ON DELETE CASCADE NOT NULL,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(change_id, ticket_id)
);

CREATE INDEX IF NOT EXISTS idx_changes_tickets_change ON changes_tickets(change_id);
CREATE INDEX IF NOT EXISTS idx_changes_tickets_ticket ON changes_tickets(ticket_id);

-- Relacionamento Change-Problem
CREATE TABLE IF NOT EXISTS changes_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_id UUID REFERENCES changes(id) ON DELETE CASCADE NOT NULL,
  problem_id UUID REFERENCES problems(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(change_id, problem_id)
);

CREATE INDEX IF NOT EXISTS idx_changes_problems_change ON changes_problems(change_id);
CREATE INDEX IF NOT EXISTS idx_changes_problems_problem ON changes_problems(problem_id);

COMMENT ON TABLE changes IS 'Mudanças ITIL - gerenciamento de mudanças';
COMMENT ON TABLE problems IS 'Problemas ITIL - análise de causa raiz';
COMMENT ON TABLE problems_tickets IS 'Relacionamento N:N entre Problems e Tickets';
COMMENT ON TABLE changes_tickets IS 'Relacionamento N:N entre Changes e Tickets';
COMMENT ON TABLE changes_problems IS 'Relacionamento N:N entre Changes e Problems';
-- Migration: 006_assets
-- Assets (Computadores, Monitores, Impressoras, etc.)

-- Estados de assets
CREATE TABLE IF NOT EXISTS states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  completename TEXT,
  comment TEXT,
  parent_id UUID REFERENCES states(id) ON DELETE SET NULL,
  level INTEGER DEFAULT 0,
  is_visible_computer BOOLEAN DEFAULT true,
  is_visible_monitor BOOLEAN DEFAULT true,
  is_visible_networkequipment BOOLEAN DEFAULT true,
  is_visible_peripheral BOOLEAN DEFAULT true,
  is_visible_phone BOOLEAN DEFAULT true,
  is_visible_printer BOOLEAN DEFAULT true,
  is_visible_softwarelicense BOOLEAN DEFAULT true,
  is_visible_softwareversion BOOLEAN DEFAULT true,
  legacy_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_states_entity ON states(entity_id);
CREATE INDEX IF NOT EXISTS idx_states_legacy_id ON states(legacy_id);

CREATE TRIGGER trigger_states_updated_at
  BEFORE UPDATE ON states
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Fabricantes
CREATE TABLE IF NOT EXISTS manufacturers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  comment TEXT,
  legacy_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manufacturers_name ON manufacturers(name);
CREATE INDEX IF NOT EXISTS idx_manufacturers_legacy_id ON manufacturers(legacy_id);

CREATE TRIGGER trigger_manufacturers_updated_at
  BEFORE UPDATE ON manufacturers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Tipos de computador
CREATE TABLE IF NOT EXISTS computer_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  comment TEXT,
  legacy_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_computer_types_legacy_id ON computer_types(legacy_id);

-- Modelos de computador
CREATE TABLE IF NOT EXISTS computer_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  comment TEXT,
  product_number TEXT,
  weight DECIMAL(10, 2),
  legacy_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_computer_models_legacy_id ON computer_models(legacy_id);

-- Computadores
CREATE TABLE IF NOT EXISTS computers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,

  -- Identificação
  serial VARCHAR(255),
  otherserial VARCHAR(255),
  uuid VARCHAR(255),

  -- Contato
  contact VARCHAR(255),
  contact_num VARCHAR(255),

  -- Responsáveis
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_id_tech UUID REFERENCES profiles(id) ON DELETE SET NULL,
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  group_id_tech UUID REFERENCES groups(id) ON DELETE SET NULL,

  -- Localização
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,

  -- Classificação
  manufacturer_id UUID REFERENCES manufacturers(id) ON DELETE SET NULL,
  model_id UUID REFERENCES computer_models(id) ON DELETE SET NULL,
  type_id UUID REFERENCES computer_types(id) ON DELETE SET NULL,
  state_id UUID REFERENCES states(id) ON DELETE SET NULL,

  -- Template
  is_template BOOLEAN DEFAULT false,
  template_name VARCHAR(255),

  -- Flags
  is_deleted BOOLEAN DEFAULT false,
  is_dynamic BOOLEAN DEFAULT false,

  -- Informações adicionais
  comment TEXT,
  ticket_tco DECIMAL(20, 4) DEFAULT 0,

  -- Inventário
  autoupdatesystem_id UUID,
  last_inventory_update TIMESTAMPTZ,
  last_boot TIMESTAMPTZ,

  -- ID legado
  legacy_id INTEGER,

  -- Timestamps
  date_creation TIMESTAMPTZ DEFAULT NOW(),
  date_mod TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_computers_entity ON computers(entity_id);
CREATE INDEX IF NOT EXISTS idx_computers_name ON computers(name);
CREATE INDEX IF NOT EXISTS idx_computers_serial ON computers(serial);
CREATE INDEX IF NOT EXISTS idx_computers_user ON computers(user_id);
CREATE INDEX IF NOT EXISTS idx_computers_user_tech ON computers(user_id_tech);
CREATE INDEX IF NOT EXISTS idx_computers_location ON computers(location_id);
CREATE INDEX IF NOT EXISTS idx_computers_manufacturer ON computers(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_computers_state ON computers(state_id);
CREATE INDEX IF NOT EXISTS idx_computers_is_deleted ON computers(is_deleted);
CREATE INDEX IF NOT EXISTS idx_computers_is_template ON computers(is_template);
CREATE INDEX IF NOT EXISTS idx_computers_legacy_id ON computers(legacy_id);

CREATE TRIGGER trigger_computers_updated_at
  BEFORE UPDATE ON computers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Tipos de monitor
CREATE TABLE IF NOT EXISTS monitor_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  comment TEXT,
  legacy_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Modelos de monitor
CREATE TABLE IF NOT EXISTS monitor_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  comment TEXT,
  product_number TEXT,
  legacy_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Monitores
CREATE TABLE IF NOT EXISTS monitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  serial VARCHAR(255),
  otherserial VARCHAR(255),
  contact VARCHAR(255),
  contact_num VARCHAR(255),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_id_tech UUID REFERENCES profiles(id) ON DELETE SET NULL,
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  group_id_tech UUID REFERENCES groups(id) ON DELETE SET NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  manufacturer_id UUID REFERENCES manufacturers(id) ON DELETE SET NULL,
  model_id UUID REFERENCES monitor_models(id) ON DELETE SET NULL,
  type_id UUID REFERENCES monitor_types(id) ON DELETE SET NULL,
  state_id UUID REFERENCES states(id) ON DELETE SET NULL,
  is_template BOOLEAN DEFAULT false,
  template_name VARCHAR(255),
  is_deleted BOOLEAN DEFAULT false,
  is_dynamic BOOLEAN DEFAULT false,
  comment TEXT,

  -- Características
  size DECIMAL(5, 2),
  have_micro BOOLEAN DEFAULT false,
  have_speaker BOOLEAN DEFAULT false,
  have_subd BOOLEAN DEFAULT false,
  have_bnc BOOLEAN DEFAULT false,
  have_dvi BOOLEAN DEFAULT false,
  have_pivot BOOLEAN DEFAULT false,
  have_hdmi BOOLEAN DEFAULT false,
  have_displayport BOOLEAN DEFAULT false,

  legacy_id INTEGER,
  date_creation TIMESTAMPTZ DEFAULT NOW(),
  date_mod TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monitors_entity ON monitors(entity_id);
CREATE INDEX IF NOT EXISTS idx_monitors_name ON monitors(name);
CREATE INDEX IF NOT EXISTS idx_monitors_serial ON monitors(serial);
CREATE INDEX IF NOT EXISTS idx_monitors_is_deleted ON monitors(is_deleted);
CREATE INDEX IF NOT EXISTS idx_monitors_legacy_id ON monitors(legacy_id);

CREATE TRIGGER trigger_monitors_updated_at
  BEFORE UPDATE ON monitors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Tipos de impressora
CREATE TABLE IF NOT EXISTS printer_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  comment TEXT,
  legacy_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Modelos de impressora
CREATE TABLE IF NOT EXISTS printer_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  comment TEXT,
  product_number TEXT,
  legacy_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Impressoras
CREATE TABLE IF NOT EXISTS printers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  serial VARCHAR(255),
  otherserial VARCHAR(255),
  contact VARCHAR(255),
  contact_num VARCHAR(255),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_id_tech UUID REFERENCES profiles(id) ON DELETE SET NULL,
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  group_id_tech UUID REFERENCES groups(id) ON DELETE SET NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  manufacturer_id UUID REFERENCES manufacturers(id) ON DELETE SET NULL,
  model_id UUID REFERENCES printer_models(id) ON DELETE SET NULL,
  type_id UUID REFERENCES printer_types(id) ON DELETE SET NULL,
  state_id UUID REFERENCES states(id) ON DELETE SET NULL,
  is_template BOOLEAN DEFAULT false,
  template_name VARCHAR(255),
  is_deleted BOOLEAN DEFAULT false,
  is_dynamic BOOLEAN DEFAULT false,
  comment TEXT,

  -- Características
  have_serial BOOLEAN DEFAULT false,
  have_parallel BOOLEAN DEFAULT false,
  have_usb BOOLEAN DEFAULT false,
  have_ethernet BOOLEAN DEFAULT false,
  have_wifi BOOLEAN DEFAULT false,
  memory_size VARCHAR(255),
  init_pages_counter INTEGER DEFAULT 0,
  last_pages_counter INTEGER DEFAULT 0,

  legacy_id INTEGER,
  date_creation TIMESTAMPTZ DEFAULT NOW(),
  date_mod TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_printers_entity ON printers(entity_id);
CREATE INDEX IF NOT EXISTS idx_printers_name ON printers(name);
CREATE INDEX IF NOT EXISTS idx_printers_serial ON printers(serial);
CREATE INDEX IF NOT EXISTS idx_printers_is_deleted ON printers(is_deleted);
CREATE INDEX IF NOT EXISTS idx_printers_legacy_id ON printers(legacy_id);

CREATE TRIGGER trigger_printers_updated_at
  BEFORE UPDATE ON printers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Tipos de periférico
CREATE TABLE IF NOT EXISTS peripheral_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  comment TEXT,
  legacy_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Modelos de periférico
CREATE TABLE IF NOT EXISTS peripheral_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  comment TEXT,
  product_number TEXT,
  legacy_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Periféricos
CREATE TABLE IF NOT EXISTS peripherals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  serial VARCHAR(255),
  otherserial VARCHAR(255),
  contact VARCHAR(255),
  contact_num VARCHAR(255),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_id_tech UUID REFERENCES profiles(id) ON DELETE SET NULL,
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  group_id_tech UUID REFERENCES groups(id) ON DELETE SET NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  manufacturer_id UUID REFERENCES manufacturers(id) ON DELETE SET NULL,
  model_id UUID REFERENCES peripheral_models(id) ON DELETE SET NULL,
  type_id UUID REFERENCES peripheral_types(id) ON DELETE SET NULL,
  state_id UUID REFERENCES states(id) ON DELETE SET NULL,
  is_template BOOLEAN DEFAULT false,
  template_name VARCHAR(255),
  is_deleted BOOLEAN DEFAULT false,
  is_dynamic BOOLEAN DEFAULT false,
  comment TEXT,
  brand VARCHAR(255),
  legacy_id INTEGER,
  date_creation TIMESTAMPTZ DEFAULT NOW(),
  date_mod TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_peripherals_entity ON peripherals(entity_id);
CREATE INDEX IF NOT EXISTS idx_peripherals_is_deleted ON peripherals(is_deleted);
CREATE INDEX IF NOT EXISTS idx_peripherals_legacy_id ON peripherals(legacy_id);

CREATE TRIGGER trigger_peripherals_updated_at
  BEFORE UPDATE ON peripherals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Relacionamento Item-Ticket (polimórfico)
CREATE TABLE IF NOT EXISTS items_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  itemtype TEXT NOT NULL,
  item_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_items_tickets_ticket ON items_tickets(ticket_id);
CREATE INDEX IF NOT EXISTS idx_items_tickets_item ON items_tickets(itemtype, item_id);

-- Relacionamento Computer-Monitor
CREATE TABLE IF NOT EXISTS computers_monitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  computer_id UUID REFERENCES computers(id) ON DELETE CASCADE NOT NULL,
  monitor_id UUID REFERENCES monitors(id) ON DELETE CASCADE NOT NULL,
  is_dynamic BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(computer_id, monitor_id)
);

CREATE INDEX IF NOT EXISTS idx_computers_monitors_computer ON computers_monitors(computer_id);
CREATE INDEX IF NOT EXISTS idx_computers_monitors_monitor ON computers_monitors(monitor_id);

-- Relacionamento Computer-Printer
CREATE TABLE IF NOT EXISTS computers_printers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  computer_id UUID REFERENCES computers(id) ON DELETE CASCADE NOT NULL,
  printer_id UUID REFERENCES printers(id) ON DELETE CASCADE NOT NULL,
  is_dynamic BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(computer_id, printer_id)
);

CREATE INDEX IF NOT EXISTS idx_computers_printers_computer ON computers_printers(computer_id);
CREATE INDEX IF NOT EXISTS idx_computers_printers_printer ON computers_printers(printer_id);

-- Relacionamento Computer-Peripheral
CREATE TABLE IF NOT EXISTS computers_peripherals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  computer_id UUID REFERENCES computers(id) ON DELETE CASCADE NOT NULL,
  peripheral_id UUID REFERENCES peripherals(id) ON DELETE CASCADE NOT NULL,
  is_dynamic BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(computer_id, peripheral_id)
);

CREATE INDEX IF NOT EXISTS idx_computers_peripherals_computer ON computers_peripherals(computer_id);
CREATE INDEX IF NOT EXISTS idx_computers_peripherals_peripheral ON computers_peripherals(peripheral_id);

COMMENT ON TABLE computers IS 'Computadores - principal asset do inventário';
COMMENT ON TABLE monitors IS 'Monitores';
COMMENT ON TABLE printers IS 'Impressoras';
COMMENT ON TABLE peripherals IS 'Periféricos genéricos (teclado, mouse, etc)';
COMMENT ON TABLE items_tickets IS 'Relacionamento polimórfico entre assets e tickets';
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
-- Migration: 008_rls_policies
-- Row Level Security Policies para todas as tabelas

-- ============================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- ============================================

ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE itil_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE changes_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE changes_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE problems_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE problems_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE problem_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE problem_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE problems_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE changes_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE changes_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE states ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE computers ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE peripherals ENABLE ROW LEVEL SECURITY;
ALTER TABLE items_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE queued_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES PARA ENTITIES
-- ============================================

-- Usuários veem entidades que têm acesso
CREATE POLICY "Users can view their entities"
  ON entities FOR SELECT
  USING (
    id = ANY(get_user_entities(auth.uid()))
  );

-- Super-admins podem gerenciar entidades
CREATE POLICY "Super-admins can manage entities"
  ON entities FOR ALL
  USING (
    check_user_permission(auth.uid(), 'entity', 119) -- ALL_STANDARD
  );

-- ============================================
-- POLICIES PARA PROFILES
-- ============================================

-- Usuários podem ver profiles da sua entidade
CREATE POLICY "Users can view profiles in their entities"
  ON profiles FOR SELECT
  USING (
    id = auth.uid()
    OR default_entity_id = ANY(get_user_entities(auth.uid()))
  );

-- Usuários podem atualizar seu próprio profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- Admins podem gerenciar profiles
CREATE POLICY "Admins can manage profiles"
  ON profiles FOR ALL
  USING (
    check_user_permission(auth.uid(), 'user', 119)
  );

-- ============================================
-- POLICIES PARA GROUPS
-- ============================================

-- Usuários veem grupos das suas entidades
CREATE POLICY "Users can view groups in their entities"
  ON groups FOR SELECT
  USING (
    entity_id = ANY(get_user_entities(auth.uid()))
  );

-- Admins podem gerenciar grupos
CREATE POLICY "Admins can manage groups"
  ON groups FOR ALL
  USING (
    check_user_permission(auth.uid(), 'group', 119)
  );

-- ============================================
-- POLICIES PARA ROLES E USER_ROLES
-- ============================================

-- Todos podem ver roles
CREATE POLICY "All authenticated users can view roles"
  ON roles FOR SELECT
  USING (auth.role() = 'authenticated');

-- Super-admins podem gerenciar roles
CREATE POLICY "Super-admins can manage roles"
  ON roles FOR ALL
  USING (
    check_user_permission(auth.uid(), 'profile', 119)
  );

-- Usuários podem ver seus próprios user_roles
CREATE POLICY "Users can view own user_roles"
  ON user_roles FOR SELECT
  USING (user_id = auth.uid());

-- Admins podem gerenciar user_roles
CREATE POLICY "Admins can manage user_roles"
  ON user_roles FOR ALL
  USING (
    check_user_permission(auth.uid(), 'profile', 119)
  );

-- ============================================
-- POLICIES PARA TICKETS
-- ============================================

-- Usuários veem tickets:
-- 1. Das suas entidades
-- 2. Que são requester
-- 3. Que estão atribuídos
-- 4. Que são observer
CREATE POLICY "Users can view tickets"
  ON tickets FOR SELECT
  USING (
    -- Ticket na entidade do usuário
    entity_id = ANY(get_user_entities(auth.uid()))
    -- Ou é requester
    OR requester_id = auth.uid()
    -- Ou está atribuído
    OR assigned_user_id = auth.uid()
    -- Ou é observer (via tickets_users)
    OR EXISTS (
      SELECT 1 FROM tickets_users tu
      WHERE tu.ticket_id = id AND tu.user_id = auth.uid()
    )
  );

-- Usuários podem criar tickets na sua entidade
CREATE POLICY "Users can create tickets"
  ON tickets FOR INSERT
  WITH CHECK (
    entity_id = ANY(get_user_entities(auth.uid()))
    AND check_user_permission(auth.uid(), 'ticket', 4) -- CREATE
  );

-- Usuários podem atualizar tickets que:
-- 1. São requester
-- 2. Estão atribuídos
-- 3. Têm permissão UPDATE
CREATE POLICY "Users can update tickets"
  ON tickets FOR UPDATE
  USING (
    requester_id = auth.uid()
    OR assigned_user_id = auth.uid()
    OR check_user_permission(auth.uid(), 'ticket', 2) -- UPDATE
  );

-- Soft delete para usuários com permissão DELETE
CREATE POLICY "Users can delete tickets"
  ON tickets FOR UPDATE
  USING (
    check_user_permission(auth.uid(), 'ticket', 8) -- DELETE
  );

-- ============================================
-- POLICIES PARA TICKETS_USERS E TICKETS_GROUPS
-- ============================================

CREATE POLICY "View ticket users"
  ON tickets_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_id
      AND (
        t.entity_id = ANY(get_user_entities(auth.uid()))
        OR t.requester_id = auth.uid()
        OR t.assigned_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Manage ticket users"
  ON tickets_users FOR ALL
  USING (
    check_user_permission(auth.uid(), 'ticket', 2) -- UPDATE
  );

CREATE POLICY "View ticket groups"
  ON tickets_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_id
      AND t.entity_id = ANY(get_user_entities(auth.uid()))
    )
  );

CREATE POLICY "Manage ticket groups"
  ON tickets_groups FOR ALL
  USING (
    check_user_permission(auth.uid(), 'ticket', 2)
  );

-- ============================================
-- POLICIES PARA FOLLOWUPS E TASKS
-- ============================================

-- Followups de tickets
CREATE POLICY "View ticket followups"
  ON ticket_followups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_id
      AND (
        t.entity_id = ANY(get_user_entities(auth.uid()))
        OR t.requester_id = auth.uid()
        OR t.assigned_user_id = auth.uid()
      )
    )
    AND (NOT is_private OR user_id = auth.uid())
  );

CREATE POLICY "Create ticket followups"
  ON ticket_followups FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_id
      AND (
        t.entity_id = ANY(get_user_entities(auth.uid()))
        OR t.requester_id = auth.uid()
        OR t.assigned_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Update own followups"
  ON ticket_followups FOR UPDATE
  USING (user_id = auth.uid());

-- Tasks de tickets
CREATE POLICY "View ticket tasks"
  ON ticket_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_id
      AND t.entity_id = ANY(get_user_entities(auth.uid()))
    )
    AND (NOT is_private OR user_id = auth.uid() OR user_id_tech = auth.uid())
  );

CREATE POLICY "Create ticket tasks"
  ON ticket_tasks FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND check_user_permission(auth.uid(), 'ticket', 2)
  );

CREATE POLICY "Update ticket tasks"
  ON ticket_tasks FOR UPDATE
  USING (
    user_id = auth.uid()
    OR user_id_tech = auth.uid()
    OR check_user_permission(auth.uid(), 'ticket', 2)
  );

-- ============================================
-- POLICIES PARA CHANGES E PROBLEMS
-- (Similar ao Tickets)
-- ============================================

-- Changes
CREATE POLICY "View changes"
  ON changes FOR SELECT
  USING (
    entity_id = ANY(get_user_entities(auth.uid()))
    AND check_user_permission(auth.uid(), 'change', 1)
  );

CREATE POLICY "Create changes"
  ON changes FOR INSERT
  WITH CHECK (
    entity_id = ANY(get_user_entities(auth.uid()))
    AND check_user_permission(auth.uid(), 'change', 4)
  );

CREATE POLICY "Update changes"
  ON changes FOR UPDATE
  USING (
    assigned_user_id = auth.uid()
    OR check_user_permission(auth.uid(), 'change', 2)
  );

-- Problems
CREATE POLICY "View problems"
  ON problems FOR SELECT
  USING (
    entity_id = ANY(get_user_entities(auth.uid()))
    AND check_user_permission(auth.uid(), 'problem', 1)
  );

CREATE POLICY "Create problems"
  ON problems FOR INSERT
  WITH CHECK (
    entity_id = ANY(get_user_entities(auth.uid()))
    AND check_user_permission(auth.uid(), 'problem', 4)
  );

CREATE POLICY "Update problems"
  ON problems FOR UPDATE
  USING (
    assigned_user_id = auth.uid()
    OR check_user_permission(auth.uid(), 'problem', 2)
  );

-- ============================================
-- POLICIES PARA ASSETS
-- ============================================

-- Computers
CREATE POLICY "View computers"
  ON computers FOR SELECT
  USING (
    entity_id = ANY(get_user_entities(auth.uid()))
    AND check_user_permission(auth.uid(), 'computer', 1)
  );

CREATE POLICY "Manage computers"
  ON computers FOR ALL
  USING (
    entity_id = ANY(get_user_entities(auth.uid()))
    AND check_user_permission(auth.uid(), 'computer', 119)
  );

-- Monitors
CREATE POLICY "View monitors"
  ON monitors FOR SELECT
  USING (
    entity_id = ANY(get_user_entities(auth.uid()))
    AND check_user_permission(auth.uid(), 'monitor', 1)
  );

CREATE POLICY "Manage monitors"
  ON monitors FOR ALL
  USING (
    entity_id = ANY(get_user_entities(auth.uid()))
    AND check_user_permission(auth.uid(), 'monitor', 119)
  );

-- Printers
CREATE POLICY "View printers"
  ON printers FOR SELECT
  USING (
    entity_id = ANY(get_user_entities(auth.uid()))
    AND check_user_permission(auth.uid(), 'printer', 1)
  );

CREATE POLICY "Manage printers"
  ON printers FOR ALL
  USING (
    entity_id = ANY(get_user_entities(auth.uid()))
    AND check_user_permission(auth.uid(), 'printer', 119)
  );

-- Peripherals
CREATE POLICY "View peripherals"
  ON peripherals FOR SELECT
  USING (
    entity_id = ANY(get_user_entities(auth.uid()))
    AND check_user_permission(auth.uid(), 'peripheral', 1)
  );

CREATE POLICY "Manage peripherals"
  ON peripherals FOR ALL
  USING (
    entity_id = ANY(get_user_entities(auth.uid()))
    AND check_user_permission(auth.uid(), 'peripheral', 119)
  );

-- ============================================
-- POLICIES PARA DOCUMENTS
-- ============================================

CREATE POLICY "View documents"
  ON documents FOR SELECT
  USING (
    entity_id = ANY(get_user_entities(auth.uid()))
    AND check_user_permission(auth.uid(), 'document', 1)
  );

CREATE POLICY "Create documents"
  ON documents FOR INSERT
  WITH CHECK (
    entity_id = ANY(get_user_entities(auth.uid()))
    AND check_user_permission(auth.uid(), 'document', 4)
  );

CREATE POLICY "Update documents"
  ON documents FOR UPDATE
  USING (
    user_id = auth.uid()
    OR check_user_permission(auth.uid(), 'document', 2)
  );

-- ============================================
-- POLICIES PARA TABELAS DE LOOKUP
-- ============================================

-- Categorias ITIL
CREATE POLICY "View itil categories"
  ON itil_categories FOR SELECT
  USING (
    entity_id = ANY(get_user_entities(auth.uid()))
  );

-- Locations
CREATE POLICY "View locations"
  ON locations FOR SELECT
  USING (
    entity_id = ANY(get_user_entities(auth.uid()))
  );

-- States (global)
CREATE POLICY "View states"
  ON states FOR SELECT
  USING (
    entity_id = ANY(get_user_entities(auth.uid()))
  );

-- Manufacturers (global)
CREATE POLICY "View manufacturers"
  ON manufacturers FOR SELECT
  USING (auth.role() = 'authenticated');

-- Document categories
CREATE POLICY "View document categories"
  ON document_categories FOR SELECT
  USING (
    entity_id IS NULL
    OR entity_id = ANY(get_user_entities(auth.uid()))
  );

-- ============================================
-- POLICIES PARA LOGS E NOTIFICAÇÕES
-- ============================================

-- Logs (somente leitura para admins)
CREATE POLICY "Admins can view logs"
  ON logs FOR SELECT
  USING (
    check_user_permission(auth.uid(), 'logs', 1)
  );

-- Sistema pode inserir logs
CREATE POLICY "System can insert logs"
  ON logs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Notificações (usuário vê as suas)
CREATE POLICY "Users view own notifications"
  ON queued_notifications FOR SELECT
  USING (recipient_id = auth.uid());

-- Sistema gerencia notificações
CREATE POLICY "System manages notifications"
  ON queued_notifications FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON POLICY "Users can view tickets" ON tickets IS 'Usuários veem tickets da sua entidade ou onde são participantes';
COMMENT ON POLICY "View ticket followups" ON ticket_followups IS 'Followups privados só são visíveis pelo autor';
