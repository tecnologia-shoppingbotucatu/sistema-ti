'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  MoreHorizontal,
  UserPlus,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
} from 'lucide-react'
import { assignTicket, solveTicket, closeTicket } from '@/actions/tickets'
import { toast } from 'sonner'

interface Ticket {
  id: string
  status: number
  assigned_to: string | null
}

interface TicketActionsProps {
  ticket: Ticket
}

export function TicketActions({ ticket }: TicketActionsProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showSolveDialog, setShowSolveDialog] = useState(false)
  const [solution, setSolution] = useState('')

  const canAssign = ticket.status === 1 // Novo
  const canSolve = ticket.status >= 1 && ticket.status <= 4 // Não solucionado nem fechado
  const canClose = ticket.status === 5 // Solucionado
  const canReopen = ticket.status === 6 // Fechado

  const handleAssignToMe = async () => {
    setIsLoading(true)
    const result = await assignTicket(ticket.id, 'current_user') // Server action vai pegar o user atual
    setIsLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Ticket atribuído a você')
      router.refresh()
    }
  }

  const handleSolve = async () => {
    if (!solution.trim()) {
      toast.error('Informe a solução')
      return
    }

    setIsLoading(true)
    const result = await solveTicket(ticket.id, solution)
    setIsLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Ticket solucionado')
      setShowSolveDialog(false)
      setSolution('')
      router.refresh()
    }
  }

  const handleClose = async () => {
    setIsLoading(true)
    const result = await closeTicket(ticket.id)
    setIsLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Ticket fechado')
      router.refresh()
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Ações
                <MoreHorizontal className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canAssign && (
            <DropdownMenuItem onClick={handleAssignToMe}>
              <UserPlus className="mr-2 h-4 w-4" />
              Atribuir a mim
            </DropdownMenuItem>
          )}

          {canSolve && (
            <DropdownMenuItem onClick={() => setShowSolveDialog(true)}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Marcar como solucionado
            </DropdownMenuItem>
          )}

          {canClose && (
            <DropdownMenuItem onClick={handleClose}>
              <XCircle className="mr-2 h-4 w-4" />
              Fechar ticket
            </DropdownMenuItem>
          )}

          {canReopen && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-orange-600">
                <Clock className="mr-2 h-4 w-4" />
                Reabrir ticket
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog de Solução */}
      <Dialog open={showSolveDialog} onOpenChange={setShowSolveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solucionar Ticket</DialogTitle>
            <DialogDescription>
              Descreva a solução aplicada para este ticket.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="solution">Solução</Label>
              <Textarea
                id="solution"
                placeholder="Descreva a solução aplicada..."
                value={solution}
                onChange={(e) => setSolution(e.target.value)}
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSolveDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSolve} disabled={isLoading || !solution.trim()}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Solucionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
