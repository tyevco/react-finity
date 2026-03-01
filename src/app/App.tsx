import { useEffect } from 'react'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Layout } from './Layout'
import { useProjectManagerStore } from '@/store/projectManagerStore'

export function App() {
  const initializeProject = useProjectManagerStore((s) => s.initializeProject)

  useEffect(() => {
    initializeProject()
  }, [initializeProject])

  return (
    <TooltipProvider>
      <div className="dark h-full">
        <Layout />
        <Toaster theme="dark" position="bottom-right" richColors />
      </div>
    </TooltipProvider>
  )
}
