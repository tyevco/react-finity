import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ViewportErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Viewport error:', error, info)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 bg-background p-8">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <div className="text-center">
            <p className="text-sm font-medium">Viewport encountered an error</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {this.state.error?.message ?? 'An unexpected error occurred'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={this.handleRetry}>
            Retry
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}
