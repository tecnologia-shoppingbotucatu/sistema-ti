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
  Edit,
  AlertTriangle,
  Ticket,
  GitBranch,
} from 'lucide-react'
import Link from 'next/link'

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

interface ProblemPageProps {
  params: Promise<{ id: string }>
}

export default async function ProblemPage({ params }: ProblemPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: problem, error } = await supabase
    .from('problems')
    .select(`
      *,
      requester:profiles!requester_id(id, username, realname, firstname, email),
      assigned:profiles!assigned_user_id(id, username, realname, firstname)
    `)
    .eq('id', id)
    .single()

  if (error || !problem) {
    notFound()
  }

  // Buscar followups
  const { data: followups } = await supabase
    .from('problem_followups')
    .select(`
      *,
      user:profiles!user_id(id, username, realname, firstname)
    `)
    .eq('problem_id', id)
    .order('created_at', { ascending: false })

  // Buscar tasks
  const { data: tasks } = await supabase
    .from('problem_tasks')
    .select(`
      *,
      user:profiles!user_id(id, username, realname, firstname)
    `)
    .eq('problem_id', id)
    .order('created_at', { ascending: false })

  // Buscar tickets vinculados
  const { data: linkedTickets } = await supabase
    .from('problems_tickets')
    .select(`
      *,
      ticket:tickets(id, name, status)
    `)
    .eq('problem_id', id)

  // Buscar changes vinculados
  const { data: linkedChanges } = await supabase
    .from('changes_problems')
    .select(`
      *,
      change:changes(id, name, status)
    `)
    .eq('problem_id', id)

  const requesterName = problem.requester
    ? `${problem.requester.firstname || ''} ${problem.requester.realname || problem.requester.username}`.trim()
    : 'Não informado'

  const assignedName = problem.assigned
    ? `${problem.assigned.firstname || ''} ${problem.assigned.realname || problem.assigned.username}`.trim()
    : 'Não atribuído'

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/problems">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
              <h1 className="text-2xl font-bold">#{problem.id.slice(0, 8)}</h1>
              <Badge variant={statusVariants[problem.status]}>
                {statusLabels[problem.status]}
              </Badge>
            </div>
            <h2 className="mt-1 text-xl text-muted-foreground">{problem.name}</h2>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/problems/${id}/edit`}>
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
                {problem.content || 'Sem descrição'}
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
                  <TabsTrigger value="changes" className="gap-2">
                    <GitBranch className="h-4 w-4" />
                    Changes ({linkedChanges?.length || 0})
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

                <TabsContent value="changes" className="mt-4">
                  {linkedChanges && linkedChanges.length > 0 ? (
                    <div className="space-y-2">
                      {linkedChanges.map((lc) => (
                        <Link
                          key={lc.id}
                          href={`/changes/${lc.change?.id}`}
                          className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted"
                        >
                          <div className="flex items-center gap-3">
                            <GitBranch className="h-4 w-4 text-muted-foreground" />
                            <span>{lc.change?.name}</span>
                          </div>
                          <Badge variant="outline">
                            Status {lc.change?.status}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">Nenhum change vinculado</p>
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
                  <p className="font-medium">{formatDate(problem.date_creation)}</p>
                </div>
              </div>

              {problem.solvedate && (
                <>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Solucionado em</p>
                      <p className="font-medium">{formatDate(problem.solvedate)}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Prioridade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Urgência</span>
                <Badge variant="outline">{urgencyLabels[problem.urgency]}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Impacto</span>
                <Badge variant="outline">{urgencyLabels[problem.impact]}</Badge>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm font-medium">Prioridade</span>
                <Badge>{problem.priority}/5</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
