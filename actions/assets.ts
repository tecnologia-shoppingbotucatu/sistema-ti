'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const createAssetSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255),
  asset_type: z.enum(['computer', 'monitor', 'printer', 'phone', 'peripheral', 'network_equipment', 'software']),
  entity_id: z.string().uuid(),
  serial: z.string().max(255).optional().nullable(),
  otherserial: z.string().max(255).optional().nullable(),
  contact: z.string().max(255).optional().nullable(),
  contact_num: z.string().max(255).optional().nullable(),
  manufacturer_id: z.string().uuid().optional().nullable(),
  model_id: z.string().uuid().optional().nullable(),
  location_id: z.string().uuid().optional().nullable(),
  user_id: z.string().uuid().optional().nullable(),
  group_id: z.string().uuid().optional().nullable(),
  state_id: z.string().uuid().optional().nullable(),
  comment: z.string().optional().nullable(),
  uuid: z.string().optional().nullable(),
  ip: z.string().optional().nullable(),
  mac: z.string().optional().nullable(),
  specifications: z.record(z.string(), z.any()).optional().default({}),
})

const updateAssetSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  serial: z.string().max(255).optional().nullable(),
  otherserial: z.string().max(255).optional().nullable(),
  contact: z.string().max(255).optional().nullable(),
  contact_num: z.string().max(255).optional().nullable(),
  manufacturer_id: z.string().uuid().optional().nullable(),
  model_id: z.string().uuid().optional().nullable(),
  location_id: z.string().uuid().optional().nullable(),
  user_id: z.string().uuid().optional().nullable(),
  group_id: z.string().uuid().optional().nullable(),
  state_id: z.string().uuid().optional().nullable(),
  comment: z.string().optional().nullable(),
  ip: z.string().optional().nullable(),
  mac: z.string().optional().nullable(),
  specifications: z.record(z.string(), z.any()).optional(),
})

export async function createAsset(input: z.infer<typeof createAssetSchema>) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Usuário não autenticado' }
  }

  const validated = createAssetSchema.safeParse(input)
  if (!validated.success) {
    return { error: 'Dados inválidos', details: validated.error.issues }
  }

  const { data, error } = await supabase
    .from('assets')
    .insert(validated.data)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Registrar log
  await supabase.from('logs').insert({
    entity_id: validated.data.entity_id,
    item_id: data.id,
    item_type: 'asset',
    user_id: user.id,
    action: 'create',
    new_value: JSON.stringify(data),
  })

  revalidatePath('/assets')
  return { data }
}

export async function updateAsset(input: z.infer<typeof updateAssetSchema>) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Usuário não autenticado' }
  }

  const validated = updateAssetSchema.safeParse(input)
  if (!validated.success) {
    return { error: 'Dados inválidos', details: validated.error.issues }
  }

  const { id, ...updateData } = validated.data

  // Buscar dados anteriores para log
  const { data: oldAsset } = await supabase
    .from('assets')
    .select('*')
    .eq('id', id)
    .single()

  const { data, error } = await supabase
    .from('assets')
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Registrar log de alterações
  if (oldAsset) {
    const changes = Object.entries(updateData).filter(
      ([key, value]) => oldAsset[key as keyof typeof oldAsset] !== value
    )

    for (const [field, newValue] of changes) {
      await supabase.from('logs').insert({
        entity_id: data.entity_id,
        item_id: id,
        item_type: 'asset',
        user_id: user.id,
        action: 'update',
        field_name: field,
        old_value: String(oldAsset[field as keyof typeof oldAsset] || ''),
        new_value: String(newValue || ''),
      })
    }
  }

  revalidatePath('/assets')
  revalidatePath(`/assets/${id}`)
  return { data }
}

export async function deleteAsset(assetId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Usuário não autenticado' }
  }

  // Soft delete
  const { error } = await supabase
    .from('assets')
    .update({
      is_deleted: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', assetId)

  if (error) {
    return { error: error.message }
  }

  await supabase.from('logs').insert({
    item_id: assetId,
    item_type: 'asset',
    user_id: user.id,
    action: 'delete',
  })

  revalidatePath('/assets')
  return { success: true }
}

export async function linkAssetToTicket(assetId: string, ticketId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Usuário não autenticado' }
  }

  const { error } = await supabase
    .from('assets_tickets')
    .insert({
      asset_id: assetId,
      ticket_id: ticketId,
    })

  if (error) {
    if (error.code === '23505') {
      return { error: 'Este ativo já está vinculado ao ticket' }
    }
    return { error: error.message }
  }

  revalidatePath('/assets')
  revalidatePath(`/assets/${assetId}`)
  revalidatePath(`/tickets/${ticketId}`)
  return { success: true }
}

export async function unlinkAssetFromTicket(assetId: string, ticketId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Usuário não autenticado' }
  }

  const { error } = await supabase
    .from('assets_tickets')
    .delete()
    .eq('asset_id', assetId)
    .eq('ticket_id', ticketId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/assets')
  revalidatePath(`/assets/${assetId}`)
  revalidatePath(`/tickets/${ticketId}`)
  return { success: true }
}

export async function installSoftware(assetId: string, softwareVersionId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Usuário não autenticado' }
  }

  const { error } = await supabase
    .from('assets_software')
    .insert({
      asset_id: assetId,
      software_version_id: softwareVersionId,
      install_date: new Date().toISOString().split('T')[0],
    })

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/assets/${assetId}`)
  return { success: true }
}

export async function uninstallSoftware(assetId: string, softwareVersionId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Usuário não autenticado' }
  }

  const { error } = await supabase
    .from('assets_software')
    .update({ is_deleted: true })
    .eq('asset_id', assetId)
    .eq('software_version_id', softwareVersionId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/assets/${assetId}`)
  return { success: true }
}
