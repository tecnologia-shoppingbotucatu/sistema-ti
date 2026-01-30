import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  User,
  Calendar,
  Edit,
  Monitor,
  Laptop,
  Printer,
  Smartphone,
  Server,
  Network,
  MapPin,
  Ticket,
  Package,
  FileText,
} from 'lucide-react'
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
  return new Date(date).toLocaleString('pt-BR')
}

interface AssetPageProps {
  params: Promise<{ id: string }>
}

export default async function AssetPage({ params }: AssetPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: asset, error } = await supabase
    .from('assets')
    .select(`
      *,
      user:profiles!user_id(id, username, realname, firstname, email)
    `)
    .eq('id', id)
    .single()

  if (error || !asset) {
    notFound()
  }

  // Buscar tickets vinculados
  const { data: linkedTickets } = await supabase
    .from('assets_tickets')
    .select(`
      *,
      ticket:tickets(id, name, status)
    `)
    .eq('asset_id', id)

  // Buscar software instalado
  const { data: installedSoftware } = await supabase
    .from('assets_software')
    .select(`
      *,
      software_version:software_versions(
        id,
        name,
        software:software(id, name)
      )
    `)
    .eq('asset_id', id)
    .eq('is_deleted', false)

  // Buscar documentos
  const { data: documents } = await supabase
    .from('documents_items')
    .select(`
      *,
      document:documents(*)
    `)
    .eq('item_id', id)
    .eq('item_type', 'asset')

  const Icon = assetTypeIcons[asset.asset_type] || Server
  const userName = asset.user
    ? `${asset.user.firstname || ''} ${asset.user.realname || asset.user.username}`.trim()
    : 'Não atribuído'

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/assets">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <Icon className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold">{asset.name}</h1>
              <Badge variant="outline">
                {assetTypeLabels[asset.asset_type] || asset.asset_type}
              </Badge>
            </div>
            {asset.serial && (
              <p className="mt-1 text-muted-foreground font-mono">
                S/N: {asset.serial}
              </p>
            )}
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/assets/${id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Especificações */}
          <Card>
            <CardHeader>
              <CardTitle>Especificações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {asset.serial && (
                  <div>
                    <p className="text-sm text-muted-foreground">Número de Série</p>
                    <p className="font-mono">{asset.serial}</p>
                  </div>
                )}
                {asset.otherserial && (
                  <div>
                    <p className="text-sm text-muted-foreground">Inventário</p>
                    <p className="font-mono">{asset.otherserial}</p>
                  </div>
                )}
                {asset.ip && (
                  <div>
                    <p className="text-sm text-muted-foreground">Endereço IP</p>
                    <p className="font-mono">{asset.ip}</p>
                  </div>
                )}
                {asset.mac && (
                  <div>
                    <p className="text-sm text-muted-foreground">MAC Address</p>
                    <p className="font-mono">{asset.mac}</p>
                  </div>
                )}
                {asset.uuid && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-muted-foreground">UUID</p>
                    <p className="font-mono text-xs">{asset.uuid}</p>
                  </div>
                )}
              </div>

              {asset.comment && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-1">Observações</p>
                  <p className="text-sm">{asset.comment}</p>
                </div>
              )}

              {asset.specifications && Object.keys(asset.specifications).length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Especificações Adicionais</p>
                  <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto">
                    {JSON.stringify(asset.specifications, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vínculos */}
          <Card>
            <CardHeader>
              <CardTitle>Vínculos</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="tickets">
                <TabsList>
                  <TabsTrigger value="tickets" className="gap-2">
                    <Ticket className="h-4 w-4" />
                    Tickets ({linkedTickets?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="software" className="gap-2">
                    <Package className="h-4 w-4" />
                    Software ({installedSoftware?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Documentos ({documents?.length || 0})
                  </TabsTrigger>
                </TabsList>

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

                <TabsContent value="software" className="mt-4">
                  {installedSoftware && installedSoftware.length > 0 ? (
                    <div className="space-y-2">
                      {installedSoftware.map((sw) => (
                        <div
                          key={sw.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="flex items-center gap-3">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">
                                {sw.software_version?.software?.name || 'Software'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Versão: {sw.software_version?.name || '-'}
                              </p>
                            </div>
                          </div>
                          {sw.install_date && (
                            <span className="text-sm text-muted-foreground">
                              Instalado em {sw.install_date}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">Nenhum software instalado</p>
                  )}
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
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{doc.document?.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {doc.document?.mime}
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
                    <p className="text-center text-muted-foreground py-8">Nenhum documento</p>
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
                  <p className="text-sm text-muted-foreground">Usuário</p>
                  <p className="font-medium">{userName}</p>
                </div>
              </div>

              {asset.contact && (
                <>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Contato</p>
                      <p className="font-medium">{asset.contact}</p>
                      {asset.contact_num && (
                        <p className="text-sm text-muted-foreground">{asset.contact_num}</p>
                      )}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Cadastrado em</p>
                  <p className="font-medium">{formatDate(asset.created_at)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Última atualização</p>
                  <p className="font-medium">{formatDate(asset.updated_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Identificação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">ID</p>
                <p className="font-mono text-xs">{asset.id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <Badge variant="outline">
                  {assetTypeLabels[asset.asset_type]}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
