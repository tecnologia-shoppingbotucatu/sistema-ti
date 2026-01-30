'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { TicketStatus, TicketType } from '@/lib/types'

// Schema de validação para criar ticket
const createTicketSchema = z.object({
  name: z.string().min(1, 'Título é obrigatório').max(255),
  content: z.string().min(10, 'Descrição deve ter no mínimo 10 caracteres'),
  type: z.nativeEnum(TicketType).default(TicketType.INCIDENT),
  urgency: z.number().min(1).max(5).default(3),
  impact: z.number().min(1).max(5).default(3),
  category_id: z.string().uuid().optional().nullable(),
  location_id: z.string().uuid().optional().nullable(),
  entity_id: z.string().uuid(),
})

// Schema para atualizar ticket
const updateTicketSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
  status: z.nativeEnum(TicketStatus).optional(),
  urgency: z.number().min(1).max(5).optional(),
  impact: z.number().min(1).max(5).optional(),
  category_id: z.string().uuid().optional().nullable(),
  location_id: z.string().uuid().optional().nullable(),
  assigned_user_id: z.string().uuid().optional().nullable(),
  assigned_group_id: z.string().uuid().optional().nullable(),
})

// Schema para adicionar followup
const addFollowupSchema = z.object({
  ticket_id: z.string().uuid(),
  content: z.string().min(1, 'Conteúdo é obrigatório'),
  is_private: z.boolean().default(false),
})

// Schema para adicionar task
const addTaskSchema = z.object({
  ticket_id: z.string().uuid(),
  content: z.string().min(1, 'Conteúdo é obrigatório'),
  state: z.number().min(0).max(2).default(0),
  user_id_tech: z.string().uuid().optional().nullable(),
  group_id_tech: z.string().uuid().optional().nullable(),
  actiontime: z.number().default(0),
  begin_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  is_private: z.boolean().default(false),
})

export type CreateTicketInput = z.infer<typeof createTicketSchema>
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>
export type AddFollowupInput = z.infer<typeof addFollowupSchema>
export type AddTaskInput = z.infer<typeof addTaskSchema>

interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  details?: z.ZodIssue[]
}

/**
 * Criar um novo ticket
 */
export async function createTicket(input: CreateTicketInput): Promise<ActionResult> {
  const supabase = await createClient()

  // Verificar autenticação
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Não autenticado' }
  }

  // Validar dados
  const validation = createTicketSchema.safeParse(input)
  if (!validation.success) {
    return {
      success: false,
      error: 'Dados inválidos',
      details: validation.error.issues,
    }
  }

  const data = validation.data

  // Criar ticket
  const { data: ticket, error } = await supabase
    .from('tickets')
    .insert({
      entity_id: data.entity_id,
      name: data.name,
      content: data.content,
      type: data.type,
      urgency: data.urgency,
      impact: data.impact,
      category_id: data.category_id,
      location_id: data.location_id,
      requester_id: user.id,
      status: TicketStatus.INCOMING,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  // Adicionar requester na tabela tickets_users
  await supabase.from('tickets_users').insert({
    ticket_id: ticket.id,
    user_id: user.id,
    type: 1, // REQUESTER
  })

  // Criar notificação
  await supabase.from('queued_notifications').insert({
    type: 'ticket_created',
    itemtype: 'Ticket',
    item_id: ticket.id,
    recipient_id: user.id,
    subject: `Ticket #${ticket.id} criado: ${ticket.name}`,
    body: `Seu ticket foi criado com sucesso.\n\n${ticket.content}`,
  })

  // Criar log
  await supabase.from('logs').insert({
    itemtype: 'Ticket',
    item_id: ticket.id,
    user_id: user.id,
    linked_action: 1, // ADD
    new_value: ticket.name,
  })

  revalidatePath('/dashboard/tickets')

  return { success: true, data: ticket }
}

/**
 * Atualizar um ticket existente
 */
export async function updateTicket(input: UpdateTicketInput): Promise<ActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Não autenticado' }
  }

  const validation = updateTicketSchema.safeParse(input)
  if (!validation.success) {
    return {
      success: false,
      error: 'Dados inválidos',
      details: validation.error.issues,
    }
  }

  const { id, ...updateData } = validation.data

  // Buscar ticket atual para log
  const { data: oldTicket } = await supabase.from('tickets').select('*').eq('id', id).single()

  if (!oldTicket) {
    return { success: false, error: 'Ticket não encontrado' }
  }

  // Atualizar
  const { data: ticket, error } = await supabase
    .from('tickets')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  // Log de alterações
  for (const [key, value] of Object.entries(updateData)) {
    if (value !== undefined && oldTicket[key as keyof typeof oldTicket] !== value) {
      await supabase.from('logs').insert({
        itemtype: 'Ticket',
        item_id: id,
        user_id: user.id,
        linked_action: 2, // UPDATE
        old_value: String(oldTicket[key as keyof typeof oldTicket] ?? ''),
        new_value: String(value ?? ''),
      })
    }
  }

  revalidatePath('/dashboard/tickets')
  revalidatePath(`/dashboard/tickets/${id}`)

  return { success: true, data: ticket }
}

/**
 * Atribuir ticket a um usuário
 */
export async function assignTicket(
  ticketId: string,
  userId: string | null,
  groupId?: string | null
): Promise<ActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Não autenticado' }
  }

  const updateData: Record<string, unknown> = {
    assigned_user_id: userId,
  }

  // Se atribuindo, mudar status para ASSIGNED
  if (userId) {
    updateData.status = TicketStatus.ASSIGNED
  }

  if (groupId !== undefined) {
    updateData.assigned_group_id = groupId
  }

  const { error } = await supabase.from('tickets').update(updateData).eq('id', ticketId)

  if (error) {
    return { success: false, error: error.message }
  }

  // Adicionar/atualizar na tabela tickets_users
  if (userId) {
    await supabase.from('tickets_users').upsert(
      {
        ticket_id: ticketId,
        user_id: userId,
        type: 2, // ASSIGN
      },
      { onConflict: 'ticket_id,user_id,type' }
    )

    // Notificar usuário atribuído
    await supabase.from('queued_notifications').insert({
      type: 'ticket_assigned',
      itemtype: 'Ticket',
      item_id: ticketId,
      recipient_id: userId,
      subject: `Ticket atribuído a você`,
      body: `Um ticket foi atribuído a você.`,
    })
  }

  revalidatePath('/dashboard/tickets')
  revalidatePath(`/dashboard/tickets/${ticketId}`)

  return { success: true }
}

/**
 * Resolver ticket
 */
export async function solveTicket(ticketId: string, solution?: string): Promise<ActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Não autenticado' }
  }

  const { error } = await supabase
    .from('tickets')
    .update({
      status: TicketStatus.SOLVED,
    })
    .eq('id', ticketId)

  if (error) {
    return { success: false, error: error.message }
  }

  // Adicionar solução como followup
  if (solution) {
    await supabase.from('ticket_followups').insert({
      ticket_id: ticketId,
      user_id: user.id,
      content: `**Solução:**\n${solution}`,
      is_private: false,
    })
  }

  revalidatePath('/dashboard/tickets')
  revalidatePath(`/dashboard/tickets/${ticketId}`)

  return { success: true }
}

/**
 * Fechar ticket
 */
export async function closeTicket(ticketId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Não autenticado' }
  }

  const { error } = await supabase
    .from('tickets')
    .update({
      status: TicketStatus.CLOSED,
    })
    .eq('id', ticketId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/tickets')
  revalidatePath(`/dashboard/tickets/${ticketId}`)

  return { success: true }
}

/**
 * Adicionar followup ao ticket
 */
export async function addTicketFollowup(input: AddFollowupInput): Promise<ActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Não autenticado' }
  }

  const validation = addFollowupSchema.safeParse(input)
  if (!validation.success) {
    return {
      success: false,
      error: 'Dados inválidos',
      details: validation.error.issues,
    }
  }

  const data = validation.data

  const { data: followup, error } = await supabase
    .from('ticket_followups')
    .insert({
      ticket_id: data.ticket_id,
      user_id: user.id,
      content: data.content,
      is_private: data.is_private,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(`/dashboard/tickets/${data.ticket_id}`)

  return { success: true, data: followup }
}

/**
 * Adicionar task ao ticket
 */
export async function addTicketTask(input: AddTaskInput): Promise<ActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Não autenticado' }
  }

  const validation = addTaskSchema.safeParse(input)
  if (!validation.success) {
    return {
      success: false,
      error: 'Dados inválidos',
      details: validation.error.issues,
    }
  }

  const data = validation.data

  const { data: task, error } = await supabase
    .from('ticket_tasks')
    .insert({
      ticket_id: data.ticket_id,
      user_id: user.id,
      user_id_tech: data.user_id_tech,
      group_id_tech: data.group_id_tech,
      content: data.content,
      state: data.state,
      actiontime: data.actiontime,
      begin_date: data.begin_date,
      end_date: data.end_date,
      is_private: data.is_private,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(`/dashboard/tickets/${data.ticket_id}`)

  return { success: true, data: task }
}

/**
 * Buscar tickets com filtros
 */
export async function getTickets(filters?: {
  status?: number
  entity_id?: string
  requester_id?: string
  assigned_user_id?: string
  page?: number
  limit?: number
}) {
  const supabase = await createClient()

  const page = filters?.page || 1
  const limit = filters?.limit || 20
  const offset = (page - 1) * limit

  let query = supabase
    .from('tickets')
    .select(
      `
      *,
      requester:profiles!requester_id(id, username, realname),
      assigned_user:profiles!assigned_user_id(id, username, realname),
      category:itil_categories(id, name),
      location:locations(id, name)
    `,
      { count: 'exact' }
    )
    .eq('is_deleted', false)

  if (filters?.status !== undefined) {
    query = query.eq('status', filters.status)
  }

  if (filters?.entity_id) {
    query = query.eq('entity_id', filters.entity_id)
  }

  if (filters?.requester_id) {
    query = query.eq('requester_id', filters.requester_id)
  }

  if (filters?.assigned_user_id) {
    query = query.eq('assigned_user_id', filters.assigned_user_id)
  }

  const { data, error, count } = await query
    .order('date_creation', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return { success: false, error: error.message }
  }

  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  }
}

/**
 * Buscar ticket por ID com timeline
 */
export async function getTicketById(ticketId: string) {
  const supabase = await createClient()

  const { data: ticket, error } = await supabase
    .from('tickets')
    .select(
      `
      *,
      requester:profiles!requester_id(id, username, realname, email),
      assigned_user:profiles!assigned_user_id(id, username, realname, email),
      assigned_group:groups(id, name),
      category:itil_categories(id, name, completename),
      location:locations(id, name, completename),
      entity:entities(id, name, completename),
      ticket_followups(
        id,
        content,
        is_private,
        date_creation,
        user:profiles(id, username, realname)
      ),
      ticket_tasks(
        id,
        content,
        state,
        actiontime,
        begin_date,
        end_date,
        is_private,
        date_creation,
        user:profiles!user_id(id, username, realname),
        tech:profiles!user_id_tech(id, username, realname)
      )
    `
    )
    .eq('id', ticketId)
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: ticket }
}
