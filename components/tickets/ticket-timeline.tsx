'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Send, Lock, Unlock } from 'lucide-react'

interface Profile {
  id: string
  username: string
  realname: string | null
  firstname: string | null
}

interface Followup {
  id: string
  content: string
  is_private: boolean
  created_at: string
  user: Profile | null
}

interface Task {
  id: string
  content: string
  is_private: boolean
  state: number
  actiontime: number
  created_at: string
  user: Profile | null
  assigned: Profile | null
}

interface TicketTimelineProps {
  ticketId: string
  followups?: Followup[]
  tasks?: Task[]
  type: 'followup' | 'task'
}

function formatDate(date: string) {
  return new Date(date).toLocaleString('pt-BR')
}

function getInitials(profile: Profile | null) {
  if (!profile) return '?'
  const first = profile.firstname?.[0] || profile.realname?.[0] || profile.username[0]
  const last = profile.realname?.split(' ').pop()?.[0] || ''
  return (first + last).toUpperCase()
}

function getUserName(profile: Profile | null) {
  if (!profile) return 'Usuário desconhecido'
  return `${profile.firstname || ''} ${profile.realname || profile.username}`.trim()
}

export function TicketTimeline({ ticketId, followups = [], tasks = [], type }: TicketTimelineProps) {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async () => {
    if (!content.trim()) return

    setIsLoading(true)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setIsLoading(false)
      return
    }

    if (type === 'followup') {
      await supabase.from('ticket_followups').insert({
        ticket_id: ticketId,
        user_id: user.id,
        content: content.trim(),
        is_private: isPrivate,
      })
    } else {
      await supabase.from('ticket_tasks').insert({
        ticket_id: ticketId,
        user_id: user.id,
        content: content.trim(),
        is_private: isPrivate,
        state: 1,
      })
    }

    setContent('')
    setIsPrivate(false)
    setIsLoading(false)
    router.refresh()
  }

  const items = type === 'followup' ? followups : tasks

  return (
    <div className="space-y-6">
      {/* Formulário de adição */}
      <div className="space-y-3">
        <Textarea
          placeholder={type === 'followup' ? 'Adicionar followup...' : 'Adicionar tarefa...'}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          disabled={isLoading}
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="private"
              checked={isPrivate}
              onCheckedChange={(checked) => setIsPrivate(checked as boolean)}
              disabled={isLoading}
            />
            <label
              htmlFor="private"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Privado (apenas técnicos)
            </label>
          </div>
          <Button onClick={handleSubmit} disabled={isLoading || !content.trim()}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Enviar
          </Button>
        </div>
      </div>

      {/* Lista de items */}
      {items.length > 0 ? (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex gap-4">
              <Avatar className="h-10 w-10">
                <AvatarFallback>{getInitials(item.user)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{getUserName(item.user)}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(item.created_at)}
                  </span>
                  {item.is_private && (
                    <Badge variant="secondary" className="gap-1">
                      <Lock className="h-3 w-3" />
                      Privado
                    </Badge>
                  )}
                  {type === 'task' && 'state' in item && (
                    <Badge variant={item.state === 2 ? 'default' : 'outline'}>
                      {item.state === 2 ? 'Concluída' : 'Pendente'}
                    </Badge>
                  )}
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm whitespace-pre-wrap">{item.content}</p>
                </div>
                {type === 'task' && 'actiontime' in item && (item as Task).actiontime > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Tempo: {Math.floor((item as Task).actiontime / 60)} min
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-8">
          {type === 'followup' ? 'Nenhum followup ainda' : 'Nenhuma tarefa ainda'}
        </p>
      )}
    </div>
  )
}
