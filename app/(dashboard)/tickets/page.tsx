import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TicketStatusLabels, UrgencyLabels, TicketStatus } from '@/lib/types'
import { Plus, Filter } from 'lucide-react'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function getStatusVariant(status: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case TicketStatus.CLOSED:
    case TicketStatus.SOLVED:
      return 'default'
    case TicketStatus.INCOMING:
      return 'destructive'
    case TicketStatus.ASSIGNED:
    case TicketStatus.PLANNED:
      return 'secondary'
    default:
      return 'outline'
  }
}

function getUrgencyColor(urgency: number): string {
  switch (urgency) {
    case 5:
      return 'text-red-600 dark:text-red-400'
    case 4:
      return 'text-orange-600 dark:text-orange-400'
    case 3:
      return 'text-yellow-600 dark:text-yellow-400'
    case 2:
      return 'text-blue-600 dark:text-blue-400'
    default:
      return 'text-green-600 dark:text-green-400'
  }
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function TicketsPage() {
  const supabase = await createClient()

  // Buscar tickets
  const { data: tickets, error } = await supabase
    .from('tickets')
    .select(
      `
      id,
      name,
      status,
      type,
      urgency,
      impact,
      priority,
      date_creation,
      requester:profiles!requester_id(username, realname),
      assigned_user:profiles!assigned_user_id(username, realname),
      category:itil_categories(name)
    `
    )
    .eq('is_deleted', false)
    .order('date_creation', { ascending: false })
    .limit(50)

  // Estatísticas rápidas
  const { count: totalTickets } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('is_deleted', false)

  const { count: openTickets } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('is_deleted', false)
    .in('status', [TicketStatus.INCOMING, TicketStatus.ASSIGNED, TicketStatus.PLANNED])

  const { count: waitingTickets } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('is_deleted', false)
    .eq('status', TicketStatus.WAITING)

  const { count: solvedTickets } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('is_deleted', false)
    .eq('status', TicketStatus.SOLVED)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tickets</h1>
          <p className="text-muted-foreground">Gerencie incidentes e requisições de serviço</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filtros
          </Button>
          <Button asChild>
            <Link href="/dashboard/tickets/new">
              <Plus className="mr-2 h-4 w-4" />
              Novo Ticket
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTickets || 0}</div>
            <p className="text-xs text-muted-foreground">tickets no sistema</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Aberto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{openTickets || 0}</div>
            <p className="text-xs text-muted-foreground">aguardando atendimento</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aguardando</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{waitingTickets || 0}</div>
            <p className="text-xs text-muted-foreground">pendentes de resposta</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolvidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{solvedTickets || 0}</div>
            <p className="text-xs text-muted-foreground">aguardando fechamento</p>
          </CardContent>
        </Card>
      </div>

      {/* Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Tickets</CardTitle>
          <CardDescription>Todos os tickets do sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8 text-destructive">
              Erro ao carregar tickets: {error.message}
            </div>
          ) : tickets && tickets.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">ID</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Urgência</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Atribuído</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/tickets/${ticket.id}`}
                        className="text-primary hover:underline"
                      >
                        #{ticket.id.slice(0, 8)}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      <Link
                        href={`/dashboard/tickets/${ticket.id}`}
                        className="hover:underline"
                      >
                        {ticket.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(ticket.status)}>
                        {TicketStatusLabels[ticket.status as TicketStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={getUrgencyColor(ticket.urgency)}>
                        {UrgencyLabels[ticket.urgency]}
                      </span>
                    </TableCell>
                    <TableCell>
                      {(ticket.requester as { realname?: string; username?: string })?.realname ||
                        (ticket.requester as { username?: string })?.username ||
                        '-'}
                    </TableCell>
                    <TableCell>
                      {(ticket.assigned_user as { realname?: string; username?: string })?.realname ||
                        (ticket.assigned_user as { username?: string })?.username ||
                        '-'}
                    </TableCell>
                    <TableCell>
                      {(ticket.category as { name?: string })?.name || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(ticket.date_creation)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum ticket encontrado. Crie um novo ticket para começar.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
