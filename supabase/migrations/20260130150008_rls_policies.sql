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
