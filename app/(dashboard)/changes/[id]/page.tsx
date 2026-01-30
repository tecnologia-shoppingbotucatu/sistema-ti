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
  Calendar,
  MessageSquare,
  CheckSquare,
  FileText,
  Edit,
  GitBranch,
  Ticket,
  AlertTriangle,
} from 'lucide-react'
import Link from 'next/link'

const statusLabels: Record<number, string> = {
  1: 'Novo',
  2: 'Avaliação',
  3: 'Aprovação',
  4: 'Teste',
  5: 'Qualificação',
  6: 'Implementado',
  7: 'Revisão',
  8: 'Fechado',
  9: 'Cancelado',
}

const statusVariants: Record<number, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  1: 'secondary',
  2: 'outline',
  3: 'outline',
  4: 'outline',
  5: 'outline',
  6: 'default',
  7: 'outline',
  8: 'default',
  9: 'destructive',
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

interface ChangePageProps {
  params: Promise<{ id: string }>
}

export default async function ChangePage({ params }: ChangePageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: change, error } = await supabase
    .from('changes')
    .select(`
      *,
      requester:profiles!requester_id(id, username, realname, firstname, email),
      assigned:profiles!assigned_user_id(id, username, realname, firstname)
    `)
    .eq('id', id)
    .single()

  if (error || !change) {
    notFound()
  }

  // Buscar followups
  const { data: followups } = await supabase
    .from('change_followups')
    .select(`
      *,
      user:profiles!user_id(id, username, realname, firstname)
    `)
    .eq('change_id', id)
    .order('created_at', { ascending: false })

  // Buscar tasks
  const { data: tasks } = await supabase
    .from('change_tasks')
    .select(`
      *,
      user:profiles!user_id(id, username, realname, firstname)
    `)
    .eq('change_id', id)
    .order('created_at', { ascending: false })

  // Buscar tickets vinculados
  const { data: linkedTickets } = await supabase
    .from('changes_tickets')
    .select(`
      *,
      ticket:tickets(id, name, status)
    `)
    .eq('change_id', id)

  // Buscar problems vinculados
  const { data: linkedProblems } = await supabase
    .from('changes_problems')
    .select(`
      *,
      problem:problems(id, name, status)
    `)
    .eq('change_id', id)

  const requesterName = change.requester
    ? `${change.requester.firstname || ''} ${change.requester.realname || change.requester.username}`.trim()
    : 'Não informado'

  const assignedName = change.assigned
    ? `${change.assigned.firstname || ''} ${change.assigned.realname || change.assigned.username}`.trim()
    : 'Não atribuído'

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/changes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <GitBranch className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold">#{change.id.slice(0, 8)}</h1>
              <Badge variant={statusVariants[change.status]}>
                {statusLabels[change.status]}
              </Badge>
            </div>
            <h2 className="mt-1 text-xl text-muted-foreground">{change.name}</h2>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/changes/${id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Link>
        </Button>
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
                {change.content || 'Sem descrição'}
              </div>
            </CardContent>
          </Card>

          {/* Timeline e Links */}
          <Card>
            <CardHeader>
              <CardTitle>Atividade e Vínculos</CardTitle>
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
                  <TabsTrigger value="tickets" className="gap-2">
                    <Ticket className="h-4 w-4" />
                    Tickets ({linkedTickets?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="problems" className="gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Problemas ({linkedProblems?.length || 0})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="followups" className="mt-4">
                  {followups && followups.length > 0 ? (
                    <div className="space-y-4">
                      {followups.map((f) => (
                        <div key={f.id} className="rounded-lg border p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium">
                              {f.user?.firstname || ''} {f.user?.realname || f.user?.username}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(f.created_at)}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{f.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">Nenhum followup</p>
                  )}
                </TabsContent>

                <TabsContent value="tasks" className="mt-4">
                  {tasks && tasks.length > 0 ? (
                    <div className="space-y-4">
                      {tasks.map((t) => (
                        <div key={t.id} className="rounded-lg border p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={t.state === 2 ? 'default' : 'outline'}>
                              {t.state === 2 ? 'Concluída' : 'Pendente'}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(t.created_at)}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{t.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">Nenhuma tarefa</p>
                  )}
                </TabsContent>

                <TabsContent value="tickets" className="mt-4">
                  {linkedTickets && linkedTickets.length > 0 ? (
                    <div className="space-y-2">
                      {linkedTickets.map((lt) => (
                        <Link
                          key={lt.id}
                          href={`/tickets/${lt.ticket?.id}`}
                          className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted"
                        >
                          <div className="flex items-center gap-3">
                            <Ticket className="h-4 w-4 text-muted-foreground" />
                            <span>{lt.ticket?.name}</span>
                          </div>
                          <Badge variant="outline">
                            Status {lt.ticket?.status}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">Nenhum ticket vinculado</p>
                  )}
                </TabsContent>

                <TabsContent value="problems" className="mt-4">
                  {linkedProblems && linkedProblems.length > 0 ? (
                    <div className="space-y-2">
                      {linkedProblems.map((lp) => (
                        <Link
                          key={lp.id}
                          href={`/problems/${lp.problem?.id}`}
                          className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted"
                        >
                          <div className="flex items-center gap-3">
                            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                            <span>{lp.problem?.name}</span>
                          </div>
                          <Badge variant="outline">
                            Status {lp.problem?.status}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">Nenhum problema vinculado</p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
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
                  <p className="font-medium">{formatDate(change.date_creation)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Prioridade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Urgência</span>
                <Badge variant="outline">{urgencyLabels[change.urgency]}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Impacto</span>
                <Badge variant="outline">{urgencyLabels[change.impact]}</Badge>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm font-medium">Prioridade</span>
                <Badge>{change.priority}/5</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
