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
import { Plus, AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'

const problemStatusLabels: Record<number, string> = {
  1: 'Novo',
  2: 'Atribuído',
  3: 'Planejado',
  4: 'Pendente',
  5: 'Solucionado',
  6: 'Fechado',
}

const problemStatusVariants: Record<number, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  1: 'secondary',
  2: 'outline',
  3: 'outline',
  4: 'destructive',
  5: 'default',
  6: 'default',
}

function formatDate(date: string | null) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('pt-BR')
}

export default async function ProblemsPage() {
  const supabase = await createClient()

  // Buscar problems
  const { data: problems } = await supabase
    .from('problems')
    .select('*')
    .eq('is_deleted', false)
    .order('date_creation', { ascending: false })
    .limit(50)

  // Estatísticas
  const { count: totalProblems } = await supabase
    .from('problems')
    .select('*', { count: 'exact', head: true })
    .eq('is_deleted', false)

  const { count: openProblems } = await supabase
    .from('problems')
    .select('*', { count: 'exact', head: true })
    .eq('is_deleted', false)
    .in('status', [1, 2, 3, 4])

  const { count: solvedProblems } = await supabase
    .from('problems')
    .select('*', { count: 'exact', head: true })
    .eq('is_deleted', false)
    .eq('status', 5)

  const { count: closedProblems } = await supabase
    .from('problems')
    .select('*', { count: 'exact', head: true })
    .eq('is_deleted', false)
    .eq('status', 6)

  const stats = [
    {
      title: 'Total de Problemas',
      value: totalProblems || 0,
      icon: AlertTriangle,
      color: 'text-orange-600',
    },
    {
      title: 'Em Aberto',
      value: openProblems || 0,
      icon: Clock,
      color: 'text-yellow-600',
    },
    {
      title: 'Solucionados',
      value: solvedProblems || 0,
      icon: CheckCircle,
      color: 'text-green-600',
    },
    {
      title: 'Fechados',
      value: closedProblems || 0,
      icon: XCircle,
      color: 'text-gray-600',
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Problemas</h1>
          <p className="text-muted-foreground">
            Gestão de Problemas - ITIL Problem Management
          </p>
        </div>
        <Button asChild>
          <Link href="/problems/new">
            <Plus className="mr-2 h-4 w-4" />
            Novo Problema
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

      {/* Problems Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Problemas</CardTitle>
          <CardDescription>
            Problemas identificados e em análise
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
              {problems && problems.length > 0 ? (
                problems.map((problem) => (
                  <TableRow key={problem.id}>
                    <TableCell className="font-mono text-xs">
                      {problem.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link
                        href={`/problems/${problem.id}`}
                        className="hover:underline"
                      >
                        {problem.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={problemStatusVariants[problem.status] || 'secondary'}>
                        {problemStatusLabels[problem.status] || 'Desconhecido'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {problem.urgency}/5
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {problem.impact}/5
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(problem.date_creation)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Nenhum problema encontrado.
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
