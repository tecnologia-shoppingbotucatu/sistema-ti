'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Ticket,
  GitBranch,
  AlertTriangle,
  Monitor,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Activity,
} from 'lucide-react'
import Link from 'next/link'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts'

interface Stats {
  tickets: {
    total: number
    open: number
    assigned: number
    solved: number
    closed: number
  }
  changes: {
    total: number
    open: number
  }
  problems: {
    total: number
    open: number
  }
  assets: {
    total: number
    byType: Record<string, number>
  }
}

interface RecentItem {
  id: string
  name: string
  type: 'ticket' | 'change' | 'problem' | 'asset'
  status: number
  created_at: string
}

const statusLabels: Record<number, string> = {
  1: 'Novo',
  2: 'Em Atendimento',
  3: 'Planejado',
  4: 'Aguardando',
  5: 'Resolvido',
  6: 'Fechado',
}

const statusColors: Record<number, string> = {
  1: '#ef4444',
  2: '#f97316',
  3: '#eab308',
  4: '#8b5cf6',
  5: '#22c55e',
  6: '#6b7280',
}

const CHART_COLORS = ['#3b82f6', '#22c55e', '#f97316', '#8b5cf6', '#ec4899', '#06b6d4']

function formatDate(date: string) {
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])
  const [ticketsByStatus, setTicketsByStatus] = useState<{ name: string; value: number; fill: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      const supabase = createClient()

      // Buscar estatísticas de tickets
      const { data: tickets } = await supabase
        .from('tickets')
        .select('status')
        .eq('is_deleted', false)

      const ticketStats = {
        total: tickets?.length || 0,
        open: tickets?.filter(t => t.status === 1).length || 0,
        assigned: tickets?.filter(t => t.status === 2).length || 0,
        solved: tickets?.filter(t => t.status === 5).length || 0,
        closed: tickets?.filter(t => t.status === 6).length || 0,
      }

      // Dados para gráfico de pizza
      const statusData = [
        { name: 'Novo', value: ticketStats.open, fill: statusColors[1] },
        { name: 'Em Atendimento', value: ticketStats.assigned, fill: statusColors[2] },
        { name: 'Resolvido', value: ticketStats.solved, fill: statusColors[5] },
        { name: 'Fechado', value: ticketStats.closed, fill: statusColors[6] },
      ].filter(item => item.value > 0)

      setTicketsByStatus(statusData)

      // Buscar estatísticas de changes
      const { data: changes } = await supabase
        .from('changes')
        .select('status')
        .eq('is_deleted', false)

      const changeStats = {
        total: changes?.length || 0,
        open: changes?.filter(c => c.status < 5).length || 0,
      }

      // Buscar estatísticas de problems
      const { data: problems } = await supabase
        .from('problems')
        .select('status')
        .eq('is_deleted', false)

      const problemStats = {
        total: problems?.length || 0,
        open: problems?.filter(p => p.status < 5).length || 0,
      }

      // Buscar estatísticas de assets
      const { data: assets } = await supabase
        .from('assets')
        .select('asset_type')
        .eq('is_deleted', false)

      const assetsByType: Record<string, number> = {}
      assets?.forEach(asset => {
        assetsByType[asset.asset_type] = (assetsByType[asset.asset_type] || 0) + 1
      })

      const assetStats = {
        total: assets?.length || 0,
        byType: assetsByType,
      }

      setStats({
        tickets: ticketStats,
        changes: changeStats,
        problems: problemStats,
        assets: assetStats,
      })

      // Buscar itens recentes
      const [{ data: recentTickets }, { data: recentChanges }, { data: recentProblems }] = await Promise.all([
        supabase
          .from('tickets')
          .select('id, name, status, created_at')
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('changes')
          .select('id, name, status, created_at')
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('problems')
          .select('id, name, status, created_at')
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(3),
      ])

      const recent: RecentItem[] = [
        ...(recentTickets?.map(t => ({ ...t, type: 'ticket' as const })) || []),
        ...(recentChanges?.map(c => ({ ...c, type: 'change' as const })) || []),
        ...(recentProblems?.map(p => ({ ...p, type: 'problem' as const })) || []),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setRecentItems(recent.slice(0, 10))
      setIsLoading(false)
    }

    loadDashboard()
  }, [])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Carregando estatísticas...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const assetChartData = Object.entries(stats?.assets.byType || {}).map(([type, count], index) => ({
    name: type === 'computer' ? 'Computadores' :
          type === 'monitor' ? 'Monitores' :
          type === 'printer' ? 'Impressoras' :
          type === 'phone' ? 'Telefones' :
          type === 'peripheral' ? 'Periféricos' :
          type === 'network_equipment' ? 'Rede' : type,
    value: count,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral do sistema de gestão de TI
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/tickets">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tickets</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.tickets.total || 0}</div>
              <div className="flex gap-2 mt-2">
                <Badge variant="destructive" className="text-xs">
                  {stats?.tickets.open || 0} novos
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {stats?.tickets.assigned || 0} em atendimento
                </Badge>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/changes">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mudanças</CardTitle>
              <GitBranch className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.changes.total || 0}</div>
              <p className="text-xs text-muted-foreground mt-2">
                {stats?.changes.open || 0} em aberto
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/problems">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Problemas</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.problems.total || 0}</div>
              <p className="text-xs text-muted-foreground mt-2">
                {stats?.problems.open || 0} em aberto
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/assets">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ativos</CardTitle>
              <Monitor className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.assets.total || 0}</div>
              <p className="text-xs text-muted-foreground mt-2">
                {Object.keys(stats?.assets.byType || {}).length} tipos
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Tickets por Status */}
        <Card>
          <CardHeader>
            <CardTitle>Tickets por Status</CardTitle>
            <CardDescription>Distribuição atual dos tickets</CardDescription>
          </CardHeader>
          <CardContent>
            {ticketsByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={ticketsByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {ticketsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Nenhum ticket encontrado
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ativos por Tipo */}
        <Card>
          <CardHeader>
            <CardTitle>Ativos por Tipo</CardTitle>
            <CardDescription>Distribuição do inventário</CardDescription>
          </CardHeader>
          <CardContent>
            {assetChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={assetChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6">
                    {assetChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Nenhum ativo encontrado
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Atividade Recente
          </CardTitle>
          <CardDescription>
            Últimos itens criados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentItems.length > 0 ? (
            <div className="space-y-4">
              {recentItems.map((item) => (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={`/${item.type}s/${item.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {item.type === 'ticket' && <Ticket className="h-4 w-4 text-blue-500" />}
                    {item.type === 'change' && <GitBranch className="h-4 w-4 text-purple-500" />}
                    {item.type === 'problem' && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.type === 'ticket' ? 'Ticket' :
                         item.type === 'change' ? 'Mudança' : 'Problema'}
                         {' • '}
                        {formatDate(item.created_at)}
                      </p>
                    </div>
                  </div>
                  <Badge variant={item.status === 1 ? 'destructive' : item.status >= 5 ? 'default' : 'secondary'}>
                    {statusLabels[item.status] || `Status ${item.status}`}
                  </Badge>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma atividade recente
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
