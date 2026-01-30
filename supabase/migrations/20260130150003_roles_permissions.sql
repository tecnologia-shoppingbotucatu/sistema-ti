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
