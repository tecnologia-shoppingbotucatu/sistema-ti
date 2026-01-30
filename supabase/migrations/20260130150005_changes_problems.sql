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
