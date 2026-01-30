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

  // Usar service role para bypass RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Buscar notificações pendentes
    const { data: pending, error: fetchError } = await supabase
      .from('queued_notifications')
      .select('*')
      .eq('status', 'pending')
      .lte('send_at', new Date().toISOString())
      .limit(100)

    if (fetchError) {
      throw fetchError
    }

    let processed = 0
    let errors = 0

    for (const notification of pending || []) {
      try {
        // Aqui você integraria com Resend, SendGrid, etc.
        // Por enquanto, apenas marca como enviado

        // Exemplo com Resend:
        // if (process.env.RESEND_API_KEY) {
        //   await fetch('https://api.resend.com/emails', {
        //     method: 'POST',
        //     headers: {
        //       'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        //       'Content-Type': 'application/json',
        //     },
        //     body: JSON.stringify({
        //       from: 'noreply@seudominio.com',
        //       to: notification.recipient_email,
        //       subject: notification.subject,
        //       html: notification.body_html || notification.body,
        //     }),
        //   })
        // }

        await supabase
          .from('queued_notifications')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', notification.id)

        processed++
      } catch (err) {
        await supabase
          .from('queued_notifications')
          .update({
            status: 'error',
            error: err instanceof Error ? err.message : 'Unknown error',
          })
          .eq('id', notification.id)

        errors++
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      errors,
      total: pending?.length || 0,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
