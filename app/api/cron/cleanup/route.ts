import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'edge'
export const maxDuration = 60

export async function GET(request: Request) {
  // Verificar secret do Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const results = {
    notificationsDeleted: 0,
    logsDeleted: 0,
    errors: [] as string[],
  }

  try {
    // 1. Limpar notificações antigas (mais de 30 dias)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { error: notifError } = await supabase
      .from('queued_notifications')
      .delete()
      .in('status', ['sent', 'error'])
      .lt('created_at', thirtyDaysAgo.toISOString())

    const notifCount = 0 // Count not available on delete

    if (notifError) {
      results.errors.push(`Notifications: ${notifError.message}`)
    } else {
      results.notificationsDeleted = notifCount || 0
    }

    // 2. Limpar logs antigos (mais de 90 dias)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const { error: logsError } = await supabase
      .from('logs')
      .delete()
      .lt('date_creation', ninetyDaysAgo.toISOString())

    const logsCount = 0 // Count not available on delete

    if (logsError) {
      results.errors.push(`Logs: ${logsError.message}`)
    } else {
      results.logsDeleted = logsCount || 0
    }

    // 3. Limpar arquivos temporários no Storage (bucket 'temp')
    // Nota: Requer listagem e deleção individual
    const { data: tempFiles, error: tempError } = await supabase.storage
      .from('temp')
      .list('', { limit: 100 })

    if (!tempError && tempFiles) {
      const oneDayAgo = new Date()
      oneDayAgo.setDate(oneDayAgo.getDate() - 1)

      const oldFiles = tempFiles.filter((file) => {
        const createdAt = new Date(file.created_at)
        return createdAt < oneDayAgo
      })

      if (oldFiles.length > 0) {
        const { error: deleteError } = await supabase.storage
          .from('temp')
          .remove(oldFiles.map((f) => f.name))

        if (deleteError) {
          results.errors.push(`Storage temp: ${deleteError.message}`)
        }
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        ...results,
      },
      { status: 500 }
    )
  }
}
