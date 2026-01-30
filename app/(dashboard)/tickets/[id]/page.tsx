import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Clock,
  User,
  Building,
  Calendar,
  MessageSquare,
  CheckSquare,
  FileText,
  Edit,
} from 'lucide-react'
import Link from 'next/link'
import { TicketTimeline } from '@/components/tickets/ticket-timeline'
import { TicketActions } from '@/components/tickets/ticket-actions'

const statusLabels: Record<number, string> = {
  1: 'Novo',
  2: 'Atribuído',
  3: 'Planejado',
  4: 'Pendente',
  5: 'Solucionado',
  6: 'Fechado',
}

const statusVariants: Record<number, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  1: 'secondary',
  2: 'outline',
  3: 'outline',
  4: 'destructive',
  5: 'default',
  6: 'default',
}

const typeLabels: Record<number, string> = {
  1: 'Incidente',
  2: 'Requisição',
}

const urgencyLabels: Record<number, string> = {
  1: 'Muito baixa',
  2: 'Baixa',
  3: 'Média',
  4: 'Alta',
  5: 'Muito alta',
}

function formatDate(date: string | null) {
  if (!date) return '-'
  return new Date(date).toLocaleString('pt-BR')
}

interface TicketPageProps {
  params: Promise<{ id: string }>
}

export default async function TicketPage({ params }: TicketPageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Buscar ticket com relacionamentos
  const { data: ticket, error } = await supabase
    .from('tickets')
    .select(`
      *,
      requester:profiles!requester_id(id, username, realname, firstname, email),
      assigned:profiles!assigned_to(id, username, realname, firstname)
    `)
    .eq('id', id)
    .single()

  if (error || !ticket) {
    notFound()
  }

  // Buscar followups
  const { data: followups } = await supabase
    .from('ticket_followups')
    .select(`
      *,
      user:profiles!user_id(id, username, realname, firstname)
    `)
    .eq('ticket_id', id)
    .order('created_at', { ascending: false })

  // Buscar tasks
  const { data: tasks } = await supabase
    .from('ticket_tasks')
    .select(`
      *,
      user:profiles!user_id(id, username, realname, firstname),
      assigned:profiles!assigned_user_id(id, username, realname, firstname)
    `)
    .eq('ticket_id', id)
    .order('created_at', { ascending: false })

  // Buscar documentos vinculados
  const { data: documents } = await supabase
    .from('documents_items')
    .select(`
      *,
      document:documents(*)
    `)
    .eq('item_id', id)
    .eq('item_type', 'ticket')

  const requesterName = ticket.requester
    ? `${ticket.requester.firstname || ''} ${ticket.requester.realname || ticket.requester.username}`.trim()
    : 'Não informado'

  const assignedName = ticket.assigned
    ? `${ticket.assigned.firstname || ''} ${ticket.assigned.realname || ticket.assigned.username}`.trim()
    : 'Não atribuído'

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tickets">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">#{ticket.id.slice(0, 8)}</h1>
              <Badge variant={statusVariants[ticket.status]}>
                {statusLabels[ticket.status]}
              </Badge>
              <Badge variant="outline">
                {typeLabels[ticket.type] || 'Incidente'}
              </Badge>
            </div>
            <h2 className="mt-1 text-xl text-muted-foreground">{ticket.name}</h2>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/tickets/${id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Link>
          </Button>
          <TicketActions ticket={ticket} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Descrição */}
          <Card>
            <CardHeader>
              <CardTitle>Descrição</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {ticket.content || 'Sem descrição'}
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Atividade</CardTitle>
              <CardDescription>
                Histórico de followups e tarefas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="followups">
                <TabsList>
                  <TabsTrigger value="followups" className="gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Followups ({followups?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="tasks" className="gap-2">
                    <CheckSquare className="h-4 w-4" />
                    Tarefas ({tasks?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Documentos ({documents?.length || 0})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="followups" className="mt-4">
                  <TicketTimeline
                    ticketId={id}
                    followups={followups || []}
                    type="followup"
                  />
                </TabsContent>

                <TabsContent value="tasks" className="mt-4">
                  <TicketTimeline
                    ticketId={id}
                    tasks={tasks || []}
                    type="task"
                  />
                </TabsContent>

                <TabsContent value="documents" className="mt-4">
                  {documents && documents.length > 0 ? (
                    <div className="space-y-2">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{doc.document?.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {doc.document?.mime} - {Math.round((doc.document?.filesize || 0) / 1024)} KB
                              </p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            Download
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum documento anexado
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Informações */}
          <Card>
            <CardHeader>
              <CardTitle>Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Solicitante</p>
                  <p className="font-medium">{requesterName}</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Atribuído a</p>
                  <p className="font-medium">{assignedName}</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Aberto em</p>
                  <p className="font-medium">{formatDate(ticket.date_creation)}</p>
                </div>
              </div>

              {ticket.solvedate && (
                <>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Solucionado em</p>
                      <p className="font-medium">{formatDate(ticket.solvedate)}</p>
                    </div>
                  </div>
                </>
              )}

              {ticket.closedate && (
                <>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Fechado em</p>
                      <p className="font-medium">{formatDate(ticket.closedate)}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Prioridade */}
          <Card>
            <CardHeader>
              <CardTitle>Prioridade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Urgência</span>
                <Badge variant="outline">{urgencyLabels[ticket.urgency]}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Impacto</span>
                <Badge variant="outline">{urgencyLabels[ticket.impact]}</Badge>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm font-medium">Prioridade</span>
                <Badge>{ticket.priority}/5</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
