// Asset Types - Computers, Monitors, Printers, etc.

export type AssetType =
  | 'Computer'
  | 'Monitor'
  | 'Printer'
  | 'Peripheral'
  | 'Phone'
  | 'NetworkEquipment'
  | 'Software'

export interface BaseAsset {
  id: string
  entity_id: string
  name: string
  serial: string | null
  otherserial: string | null
  contact: string | null
  contact_num: string | null
  user_id: string | null
  user_id_tech: string | null
  group_id: string | null
  group_id_tech: string | null
  location_id: string | null
  manufacturer_id: string | null
  state_id: string | null
  is_template: boolean
  template_name: string | null
  is_deleted: boolean
  is_dynamic: boolean
  comment: string | null
  date_creation: string
  date_mod: string
}

export interface Computer extends BaseAsset {
  asset_type: 'Computer'
  model_id: string | null
  type_id: string | null
  network_id: string | null
  uuid: string | null
  autoupdatesystem_id: string | null
  last_inventory_update: string | null
  last_boot: string | null
}

export interface Monitor extends BaseAsset {
  asset_type: 'Monitor'
  model_id: string | null
  type_id: string | null
  size: number | null
  have_micro: boolean
  have_speaker: boolean
  have_subd: boolean
  have_bnc: boolean
  have_dvi: boolean
  have_pivot: boolean
  have_hdmi: boolean
  have_displayport: boolean
}

export interface Printer extends BaseAsset {
  asset_type: 'Printer'
  model_id: string | null
  type_id: string | null
  network_id: string | null
  have_serial: boolean
  have_parallel: boolean
  have_usb: boolean
  have_ethernet: boolean
  have_wifi: boolean
  memory_size: string | null
  init_pages_counter: number
  last_pages_counter: number
}

export interface Peripheral extends BaseAsset {
  asset_type: 'Peripheral'
  model_id: string | null
  type_id: string | null
}

export interface Phone extends BaseAsset {
  asset_type: 'Phone'
  model_id: string | null
  type_id: string | null
  brand: string | null
  phonepoweringsupply_id: string | null
  number_line: string | null
  have_headset: boolean
  have_hp: boolean
  firmware: string | null
}

export interface NetworkEquipment extends BaseAsset {
  asset_type: 'NetworkEquipment'
  model_id: string | null
  type_id: string | null
  network_id: string | null
  ram: string | null
  firmware: string | null
  ip: string | null
  mac: string | null
}

export interface Software {
  id: string
  entity_id: string
  name: string
  comment: string | null
  manufacturer_id: string | null
  category_id: string | null
  is_helpdesk_visible: boolean
  is_valid: boolean
  is_deleted: boolean
  date_creation: string
  date_mod: string
}

export interface SoftwareVersion {
  id: string
  software_id: string
  entity_id: string
  name: string
  comment: string | null
  state_id: string | null
  operatingsystem_id: string | null
  date_creation: string
  date_mod: string
}

export interface SoftwareLicense {
  id: string
  software_id: string
  entity_id: string
  name: string
  serial: string | null
  number: number
  softwarelicensetype_id: string | null
  softwarelicense_id: string | null // Parent license
  comment: string | null
  expire: string | null
  date_creation: string
  date_mod: string
}

// Union type for any asset
export type Asset = Computer | Monitor | Printer | Peripheral | Phone | NetworkEquipment

// State enum
export enum AssetState {
  IN_USE = 1,
  AVAILABLE = 2,
  MAINTENANCE = 3,
  REPAIR = 4,
  DISPOSED = 5,
}

export const AssetStateLabels: Record<AssetState, string> = {
  [AssetState.IN_USE]: 'Em uso',
  [AssetState.AVAILABLE]: 'Disponível',
  [AssetState.MAINTENANCE]: 'Em manutenção',
  [AssetState.REPAIR]: 'Em reparo',
  [AssetState.DISPOSED]: 'Descartado',
}

export const AssetTypeLabels: Record<AssetType, string> = {
  Computer: 'Computador',
  Monitor: 'Monitor',
  Printer: 'Impressora',
  Peripheral: 'Periférico',
  Phone: 'Telefone',
  NetworkEquipment: 'Equipamento de Rede',
  Software: 'Software',
}
