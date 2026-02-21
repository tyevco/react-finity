import { TooltipProvider } from '@/components/ui/tooltip'
import { Layout } from './Layout'

export function App() {
  return (
    <TooltipProvider>
      <div className="dark h-full">
        <Layout />
      </div>
    </TooltipProvider>
  )
}
