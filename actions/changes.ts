'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const createChangeSchema = z.object({
  name: z.string().min(1, 'Título é obrigatório').max(255),
  content: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  urgency: z.number().min(1).max(5).default(3),
  impact: z.number().min(1).max(5).default(3),
  entity_id: z.string().uuid(),
  category_id: z.string().uuid().optional().nullable(),
})

const updateChangeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  content: z.string().min(10).optional(),
  status: z.number().min(1).max(9).optional(),
  urgency: z.number().min(1).max(5).optional(),
  impact: z.number().min(1).max(5).optional(),
  category_id: z.string().uuid().optional().nullable(),
  assigned_user_id: z.string().uuid().optional().nullable(),
  assigned_group_id: z.string().uuid().optional().nullable(),
})

export async function createChange(input: z.infer<typeof createChangeSchema>) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Usuário não autenticado' }
  }

  const validated = createChangeSchema.safeParse(input)
  if (!validated.success) {
    return { error: 'Dados inválidos', details: validated.error.issues }
  }

  const { data, error } = await supabase
    .from('changes')
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
    notification_type: 'change_created',
    item_id: data.id,
    item_type: 'change',
    recipient_id: user.id,
  })

  revalidatePath('/changes')
  return { data }
}

export async function updateChange(input: z.infer<typeof updateChangeSchema>) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Usuário não autenticado' }
  }

  const validated = updateChangeSchema.safeParse(input)
  if (!validated.success) {
    return { error: 'Dados inválidos', details: validated.error.issues }
  }

  const { id, ...updateData } = validated.data

  const { data, error } = await supabase
    .from('changes')
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

  revalidatePath('/changes')
  revalidatePath(`/changes/${id}`)
  return { data }
}

export async function approveChange(changeId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Usuário não autenticado' }
  }

  // Buscar change atual
  const { data: change } = await supabase
    .from('changes')
    .select('status')
    .eq('id', changeId)
    .single()

  if (!change) {
    return { error: 'Mudança não encontrada' }
  }

  // Status 3 = Aprovação, próximo é 4 = Teste
  if (change.status !== 3) {
    return { error: 'Mudança não está em fase de aprovação' }
  }

  const { error } = await supabase
    .from('changes')
    .update({
      status: 4, // Teste
      date_mod: new Date().toISOString(),
    })
    .eq('id', changeId)

  if (error) {
    return { error: error.message }
  }

  // Registrar followup de aprovação
  await supabase.from('change_followups').insert({
    change_id: changeId,
    user_id: user.id,
    content: 'Mudança aprovada para fase de teste.',
    is_private: false,
  })

  revalidatePath('/changes')
  revalidatePath(`/changes/${changeId}`)
  return { success: true }
}

export async function implementChange(changeId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Usuário não autenticado' }
  }

  const { error } = await supabase
    .from('changes')
    .update({
      status: 6, // Implementado
      date_mod: new Date().toISOString(),
    })
    .eq('id', changeId)

  if (error) {
    return { error: error.message }
  }

  await supabase.from('change_followups').insert({
    change_id: changeId,
    user_id: user.id,
    content: 'Mudança implementada com sucesso.',
    is_private: false,
  })

  revalidatePath('/changes')
  revalidatePath(`/changes/${changeId}`)
  return { success: true }
}

export async function closeChange(changeId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Usuário não autenticado' }
  }

  const { error } = await supabase
    .from('changes')
    .update({
      status: 8, // Fechado
      closedate: new Date().toISOString(),
      date_mod: new Date().toISOString(),
    })
    .eq('id', changeId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/changes')
  revalidatePath(`/changes/${changeId}`)
  return { success: true }
}

export async function cancelChange(changeId: string, reason: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Usuário não autenticado' }
  }

  const { error } = await supabase
    .from('changes')
    .update({
      status: 9, // Cancelado
      closedate: new Date().toISOString(),
      date_mod: new Date().toISOString(),
    })
    .eq('id', changeId)

  if (error) {
    return { error: error.message }
  }

  await supabase.from('change_followups').insert({
    change_id: changeId,
    user_id: user.id,
    content: `Mudança cancelada. Motivo: ${reason}`,
    is_private: false,
  })

  revalidatePath('/changes')
  revalidatePath(`/changes/${changeId}`)
  return { success: true }
}
