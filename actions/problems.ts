'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const createProblemSchema = z.object({
  name: z.string().min(1, 'Título é obrigatório').max(255),
  content: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  urgency: z.number().min(1).max(5).default(3),
  impact: z.number().min(1).max(5).default(3),
  entity_id: z.string().uuid(),
  category_id: z.string().uuid().optional().nullable(),
})

const updateProblemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  content: z.string().min(10).optional(),
  status: z.number().min(1).max(6).optional(),
  urgency: z.number().min(1).max(5).optional(),
  impact: z.number().min(1).max(5).optional(),
  category_id: z.string().uuid().optional().nullable(),
  assigned_user_id: z.string().uuid().optional().nullable(),
  assigned_group_id: z.string().uuid().optional().nullable(),
})

export async function createProblem(input: z.infer<typeof createProblemSchema>) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Usuário não autenticado' }
  }

  const validated = createProblemSchema.safeParse(input)
  if (!validated.success) {
    return { error: 'Dados inválidos', details: validated.error.issues }
  }

  const { data, error } = await supabase
    .from('problems')
    .insert({
      ...validated.data,
      requester_id: user.id,
      status: 1, // Novo
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Criar notificação
  await supabase.from('queued_notifications').insert({
    notification_type: 'problem_created',
    item_id: data.id,
    item_type: 'problem',
    recipient_id: user.id,
  })

  revalidatePath('/problems')
  return { data }
}

export async function updateProblem(input: z.infer<typeof updateProblemSchema>) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Usuário não autenticado' }
  }

  const validated = updateProblemSchema.safeParse(input)
  if (!validated.success) {
    return { error: 'Dados inválidos', details: validated.error.issues }
  }

  const { id, ...updateData } = validated.data

  const { data, error } = await supabase
    .from('problems')
    .update({
      ...updateData,
      date_mod: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/problems')
  revalidatePath(`/problems/${id}`)
  return { data }
}

export async function assignProblem(problemId: string, userId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Usuário não autenticado' }
  }

  const { error } = await supabase
    .from('problems')
    .update({
      assigned_user_id: userId,
      status: 2, // Atribuído
      date_mod: new Date().toISOString(),
    })
    .eq('id', problemId)

  if (error) {
    return { error: error.message }
  }

  await supabase.from('problem_followups').insert({
    problem_id: problemId,
    user_id: user.id,
    content: `Problema atribuído ao usuário.`,
    is_private: false,
  })

  revalidatePath('/problems')
  revalidatePath(`/problems/${problemId}`)
  return { success: true }
}

export async function solveProblem(problemId: string, solution: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Usuário não autenticado' }
  }

  const { error } = await supabase
    .from('problems')
    .update({
      status: 5, // Solucionado
      solvedate: new Date().toISOString(),
      date_mod: new Date().toISOString(),
    })
    .eq('id', problemId)

  if (error) {
    return { error: error.message }
  }

  await supabase.from('problem_followups').insert({
    problem_id: problemId,
    user_id: user.id,
    content: `Problema solucionado.\n\nSolução: ${solution}`,
    is_private: false,
  })

  revalidatePath('/problems')
  revalidatePath(`/problems/${problemId}`)
  return { success: true }
}

export async function closeProblem(problemId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Usuário não autenticado' }
  }

  const { error } = await supabase
    .from('problems')
    .update({
      status: 6, // Fechado
      closedate: new Date().toISOString(),
      date_mod: new Date().toISOString(),
    })
    .eq('id', problemId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/problems')
  revalidatePath(`/problems/${problemId}`)
  return { success: true }
}

export async function linkProblemToTicket(problemId: string, ticketId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Usuário não autenticado' }
  }

  const { error } = await supabase
    .from('problems_tickets')
    .insert({
      problem_id: problemId,
      ticket_id: ticketId,
    })

  if (error) {
    if (error.code === '23505') {
      return { error: 'Este ticket já está vinculado ao problema' }
    }
    return { error: error.message }
  }

  revalidatePath('/problems')
  revalidatePath(`/problems/${problemId}`)
  revalidatePath(`/tickets/${ticketId}`)
  return { success: true }
}

export async function unlinkProblemFromTicket(problemId: string, ticketId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Usuário não autenticado' }
  }

  const { error } = await supabase
    .from('problems_tickets')
    .delete()
    .eq('problem_id', problemId)
    .eq('ticket_id', ticketId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/problems')
  revalidatePath(`/problems/${problemId}`)
  revalidatePath(`/tickets/${ticketId}`)
  return { success: true }
}
