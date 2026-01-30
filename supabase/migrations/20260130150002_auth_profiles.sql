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
