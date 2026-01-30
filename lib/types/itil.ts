// ITIL Types - Tickets, Changes, Problems

export enum TicketStatus {
  INCOMING = 1,
  ASSIGNED = 2,
  PLANNED = 3,
  WAITING = 4,
  SOLVED = 5,
  CLOSED = 6,
}

export enum TicketType {
  INCIDENT = 1,
  REQUEST = 2,
}

export enum ChangeStatus {
  NEW = 1,
  EVALUATION = 2,
  APPROVAL = 3,
  TESTING = 4,
  QUALIFICATION = 5,
  APPLIED = 6,
  REVIEW = 7,
  CLOSED = 8,
  CANCELED = 9,
  REFUSED = 10,
}

export enum ProblemStatus {
  INCOMING = 1,
  ASSIGNED = 2,
  PLANNED = 3,
  WAITING = 4,
  SOLVED = 5,
  OBSERVED = 7,
  CLOSED = 6,
}

export interface Ticket {
  id: string
  entity_id: string
  name: string
  content: string | null
  status: TicketStatus
  type: TicketType
  urgency: 1 | 2 | 3 | 4 | 5
  impact: 1 | 2 | 3 | 4 | 5
  priority: number
  category_id: string | null
  location_id: string | null
  requester_id: string
  assigned_user_id: string | null
  assigned_group_id: string | null
  sla_id: string | null
  date_creation: string
  date_mod: string
  solvedate: string | null
  closedate: string | null
  is_deleted: boolean
}

export interface Change {
  id: string
  entity_id: string
  name: string
  content: string | null
  status: ChangeStatus
  urgency: 1 | 2 | 3 | 4 | 5
  impact: 1 | 2 | 3 | 4 | 5
  priority: number
  category_id: string | null
  requester_id: string
  assigned_user_id: string | null
  assigned_group_id: string | null
  impactcontent: string | null
  controlistcontent: string | null
  rolloutplancontent: string | null
  backoutplancontent: string | null
  checklistcontent: string | null
  date_creation: string
  date_mod: string
  solvedate: string | null
  closedate: string | null
  is_deleted: boolean
}

export interface Problem {
  id: string
  entity_id: string
  name: string
  content: string | null
  status: ProblemStatus
  urgency: 1 | 2 | 3 | 4 | 5
  impact: 1 | 2 | 3 | 4 | 5
  priority: number
  category_id: string | null
  requester_id: string
  assigned_user_id: string | null
  assigned_group_id: string | null
  impactcontent: string | null
  causecontent: string | null
  symptomcontent: string | null
  date_creation: string
  date_mod: string
  solvedate: string | null
  closedate: string | null
  is_deleted: boolean
}

// ITILFollowup - comum para Tickets, Changes e Problems
export interface ITILFollowup {
  id: string
  item_id: string
  itemtype: 'Ticket' | 'Change' | 'Problem'
  user_id: string
  content: string
  is_private: boolean
  date_creation: string
  date_mod: string
}

// ITILTask - comum para Tickets, Changes e Problems
export interface ITILTask {
  id: string
  item_id: string
  itemtype: 'Ticket' | 'Change' | 'Problem'
  user_id: string
  user_id_tech: string | null
  group_id_tech: string | null
  content: string
  state: 0 | 1 | 2 // 0=TODO, 1=INFO, 2=DONE
  actiontime: number
  begin: string | null
  end: string | null
  is_private: boolean
  date_creation: string
  date_mod: string
}

// Helpers
export const TicketStatusLabels: Record<TicketStatus, string> = {
  [TicketStatus.INCOMING]: 'Novo',
  [TicketStatus.ASSIGNED]: 'Atribuído',
  [TicketStatus.PLANNED]: 'Planejado',
  [TicketStatus.WAITING]: 'Aguardando',
  [TicketStatus.SOLVED]: 'Resolvido',
  [TicketStatus.CLOSED]: 'Fechado',
}

export const ChangeStatusLabels: Record<ChangeStatus, string> = {
  [ChangeStatus.NEW]: 'Novo',
  [ChangeStatus.EVALUATION]: 'Avaliação',
  [ChangeStatus.APPROVAL]: 'Aprovação',
  [ChangeStatus.TESTING]: 'Teste',
  [ChangeStatus.QUALIFICATION]: 'Qualificação',
  [ChangeStatus.APPLIED]: 'Aplicado',
  [ChangeStatus.REVIEW]: 'Revisão',
  [ChangeStatus.CLOSED]: 'Fechado',
  [ChangeStatus.CANCELED]: 'Cancelado',
  [ChangeStatus.REFUSED]: 'Recusado',
}

export const ProblemStatusLabels: Record<ProblemStatus, string> = {
  [ProblemStatus.INCOMING]: 'Novo',
  [ProblemStatus.ASSIGNED]: 'Atribuído',
  [ProblemStatus.PLANNED]: 'Planejado',
  [ProblemStatus.WAITING]: 'Aguardando',
  [ProblemStatus.SOLVED]: 'Resolvido',
  [ProblemStatus.OBSERVED]: 'Observado',
  [ProblemStatus.CLOSED]: 'Fechado',
}

export const UrgencyLabels: Record<number, string> = {
  1: 'Muito baixa',
  2: 'Baixa',
  3: 'Média',
  4: 'Alta',
  5: 'Muito alta',
}

export const ImpactLabels: Record<number, string> = {
  1: 'Muito baixo',
  2: 'Baixo',
  3: 'Médio',
  4: 'Alto',
  5: 'Muito alto',
}

export const PriorityLabels: Record<number, string> = {
  1: 'Muito baixa',
  2: 'Baixa',
  3: 'Média',
  4: 'Alta',
  5: 'Muito alta',
  6: 'Crítica',
}
