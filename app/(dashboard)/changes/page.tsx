import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, GitBranch, Clock, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'

const changeStatusLabels: Record<number, string> = {
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

const changeStatusVariants: Record<number, 'default' | 'secondary' | 'destructive' | 'outline'> = {
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

function formatDate(date: string | null) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('pt-BR')
}

export default async function ChangesPage() {
  const supabase = await createClient()

  // Buscar changes
  const { data: changes } = await supabase
    .from('changes')
    .select('*')
    .eq('is_deleted', false)
    .order('date_creation', { ascending: false })
    .limit(50)

  // Estatísticas
  const { count: totalChanges } = await supabase
    .from('changes')
    .select('*', { count: 'exact', head: true })
    .eq('is_deleted', false)

  const { count: pendingChanges } = await supabase
    .from('changes')
    .select('*', { count: 'exact', head: true })
    .eq('is_deleted', false)
    .in('status', [1, 2, 3, 4, 5])

  const { count: implementedChanges } = await supabase
    .from('changes')
    .select('*', { count: 'exact', head: true })
    .eq('is_deleted', false)
    .eq('status', 6)

  const { count: cancelledChanges } = await supabase
    .from('changes')
    .select('*', { count: 'exact', head: true })
    .eq('is_deleted', false)
    .eq('status', 9)

  const stats = [
    {
      title: 'Total de Changes',
      value: totalChanges || 0,
      icon: GitBranch,
      color: 'text-blue-600',
    },
    {
      title: 'Em Andamento',
      value: pendingChanges || 0,
      icon: Clock,
      color: 'text-yellow-600',
    },
    {
      title: 'Implementados',
      value: implementedChanges || 0,
      icon: CheckCircle,
      color: 'text-green-600',
    },
    {
      title: 'Cancelados',
      value: cancelledChanges || 0,
      icon: XCircle,
      color: 'text-red-600',
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Changes</h1>
          <p className="text-muted-foreground">
            Gestão de Mudanças - ITIL Change Management
          </p>
        </div>
        <Button asChild>
          <Link href="/changes/new">
            <Plus className="mr-2 h-4 w-4" />
            Nova Mudança
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Changes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Mudanças</CardTitle>
          <CardDescription>
            Mudanças recentes no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Urgência</TableHead>
                <TableHead>Impacto</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {changes && changes.length > 0 ? (
                changes.map((change) => (
                  <TableRow key={change.id}>
                    <TableCell className="font-mono text-xs">
                      {change.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link
                        href={`/changes/${change.id}`}
                        className="hover:underline"
                      >
                        {change.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={changeStatusVariants[change.status] || 'secondary'}>
                        {changeStatusLabels[change.status] || 'Desconhecido'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {change.urgency}/5
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {change.impact}/5
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(change.date_creation)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Nenhuma mudança encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
