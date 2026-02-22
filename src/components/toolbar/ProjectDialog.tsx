import { useState } from 'react'
import { FolderOpen, Pencil, Trash2, Check, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useProjectManagerStore } from '@/store/projectManagerStore'

interface ProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProjectDialog({ open, onOpenChange }: ProjectDialogProps) {
  const projects = useProjectManagerStore((s) => s.projects)
  const currentProjectId = useProjectManagerStore((s) => s.currentProjectId)
  const loadProject = useProjectManagerStore((s) => s.loadProject)
  const renameProject = useProjectManagerStore((s) => s.renameProject)
  const deleteProject = useProjectManagerStore((s) => s.deleteProject)

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const sortedProjects = [...projects].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )

  const handleLoad = (id: string) => {
    loadProject(id)
    onOpenChange(false)
  }

  const handleStartRename = (id: string, currentName: string) => {
    setRenamingId(id)
    setRenameValue(currentName)
    setConfirmDeleteId(null)
  }

  const handleConfirmRename = () => {
    if (renamingId && renameValue.trim()) {
      renameProject(renamingId, renameValue.trim())
    }
    setRenamingId(null)
    setRenameValue('')
  }

  const handleCancelRename = () => {
    setRenamingId(null)
    setRenameValue('')
  }

  const handleDelete = (id: string) => {
    deleteProject(id)
    setConfirmDeleteId(null)
  }

  const formatDate = (iso: string): string => {
    const date = new Date(iso)
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Projects</DialogTitle>
          <DialogDescription>Load, rename, or delete saved projects.</DialogDescription>
        </DialogHeader>

        {sortedProjects.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No saved projects yet. Save your current project to see it here.
          </div>
        ) : (
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-1">
              {sortedProjects.map((project) => (
                <div key={project.id}>
                  <div className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-accent/50">
                    {renamingId === project.id ? (
                      <div className="flex flex-1 items-center gap-1">
                        <Input
                          value={renameValue}
                          onChange={(e) => { setRenameValue(e.target.value) }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleConfirmRename()
                            if (e.key === 'Escape') handleCancelRename()
                          }}
                          className="h-7 text-xs"
                          autoFocus
                          aria-label="Project name"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={handleConfirmRename}
                          aria-label="Confirm rename"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={handleCancelRename}
                          aria-label="Cancel rename"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-medium">
                              {project.name}
                            </span>
                            {project.id === currentProjectId && (
                              <span className="shrink-0 rounded bg-accent px-1 py-0.5 text-[10px] text-accent-foreground">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {formatDate(project.updatedAt)}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => { handleLoad(project.id) }}
                          aria-label={`Load ${project.name}`}
                        >
                          <FolderOpen className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => { handleStartRename(project.id, project.name) }}
                          aria-label={`Rename ${project.name}`}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        {confirmDeleteId === project.id ? (
                          <div className="flex items-center gap-0.5">
                            <Button
                              variant="destructive"
                              size="icon"
                              className="h-6 w-6 shrink-0"
                              onClick={() => { handleDelete(project.id) }}
                              aria-label="Confirm delete"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0"
                              onClick={() => { setConfirmDeleteId(null) }}
                              aria-label="Cancel delete"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={() => { setConfirmDeleteId(project.id) }}
                            aria-label={`Delete ${project.name}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                  <Separator />
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}
