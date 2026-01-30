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
