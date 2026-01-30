import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Monitor, Laptop, Printer, Smartphone, Server, Network } from 'lucide-react'
import Link from 'next/link'

const assetTypeLabels: Record<string, string> = {
  computer: 'Computador',
  monitor: 'Monitor',
  printer: 'Impressora',
  phone: 'Telefone',
  peripheral: 'Periférico',
  network_equipment: 'Equipamento de Rede',
  software: 'Software',
}

const assetTypeIcons: Record<string, typeof Monitor> = {
  computer: Laptop,
  monitor: Monitor,
  printer: Printer,
  phone: Smartphone,
  peripheral: Server,
  network_equipment: Network,
}

function formatDate(date: string | null) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('pt-BR')
}

export default async function AssetsPage() {
  const supabase = await createClient()

  // Buscar assets
  const { data: assets } = await supabase
    .from('assets')
    .select('*')
    .eq('is_deleted', false)
    .eq('is_template', false)
    .order('created_at', { ascending: false })
    .limit(50)

  // Estatísticas por tipo
  const { data: assetCounts } = await supabase
    .from('assets')
    .select('asset_type')
    .eq('is_deleted', false)
    .eq('is_template', false)

  const countsByType = assetCounts?.reduce((acc, asset) => {
    acc[asset.asset_type] = (acc[asset.asset_type] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  const totalAssets = Object.values(countsByType).reduce((a, b) => a + b, 0)

  const stats = [
    {
      title: 'Total de Ativos',
      value: totalAssets,
      icon: Server,
      color: 'text-blue-600',
    },
    {
      title: 'Computadores',
      value: countsByType['computer'] || 0,
      icon: Laptop,
      color: 'text-green-600',
    },
    {
      title: 'Monitores',
      value: countsByType['monitor'] || 0,
      icon: Monitor,
      color: 'text-purple-600',
    },
    {
      title: 'Impressoras',
      value: countsByType['printer'] || 0,
      icon: Printer,
      color: 'text-orange-600',
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ativos</h1>
          <p className="text-muted-foreground">
            Inventário de ativos de TI
          </p>
        </div>
        <Button asChild>
          <Link href="/assets/new">
            <Plus className="mr-2 h-4 w-4" />
            Novo Ativo
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

      {/* Assets Table with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Ativos</CardTitle>
          <CardDescription>
            Todos os ativos de TI cadastrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="computer">Computadores</TabsTrigger>
              <TabsTrigger value="monitor">Monitores</TabsTrigger>
              <TabsTrigger value="printer">Impressoras</TabsTrigger>
              <TabsTrigger value="network_equipment">Rede</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <AssetTable assets={assets || []} />
            </TabsContent>

            <TabsContent value="computer" className="mt-4">
              <AssetTable
                assets={(assets || []).filter((a) => a.asset_type === 'computer')}
              />
            </TabsContent>

            <TabsContent value="monitor" className="mt-4">
              <AssetTable
                assets={(assets || []).filter((a) => a.asset_type === 'monitor')}
              />
            </TabsContent>

            <TabsContent value="printer" className="mt-4">
              <AssetTable
                assets={(assets || []).filter((a) => a.asset_type === 'printer')}
              />
            </TabsContent>

            <TabsContent value="network_equipment" className="mt-4">
              <AssetTable
                assets={(assets || []).filter((a) => a.asset_type === 'network_equipment')}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

interface AssetTableProps {
  assets: Array<{
    id: string
    name: string
    asset_type: string
    serial: string | null
    ip: string | null
    mac: string | null
    created_at: string
  }>
}

function AssetTable({ assets }: AssetTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">ID</TableHead>
          <TableHead>Nome</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Serial</TableHead>
          <TableHead>IP</TableHead>
          <TableHead>MAC</TableHead>
          <TableHead>Cadastro</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assets.length > 0 ? (
          assets.map((asset) => {
            const Icon = assetTypeIcons[asset.asset_type] || Server
            return (
              <TableRow key={asset.id}>
                <TableCell className="font-mono text-xs">
                  {asset.id.slice(0, 8)}
                </TableCell>
                <TableCell className="font-medium">
                  <Link
                    href={`/assets/${asset.id}`}
                    className="flex items-center gap-2 hover:underline"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {asset.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {assetTypeLabels[asset.asset_type] || asset.asset_type}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {asset.serial || '-'}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {asset.ip || '-'}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {asset.mac || '-'}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(asset.created_at)}
                </TableCell>
              </TableRow>
            )
          })
        ) : (
          <TableRow>
            <TableCell colSpan={7} className="h-24 text-center">
              Nenhum ativo encontrado.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
