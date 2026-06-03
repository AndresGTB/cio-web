import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex h-64 flex-col items-center justify-center gap-4 text-center">
            <AlertTriangle className="h-12 w-12 text-semantic-warning" strokeWidth={1} />
            <div>
              <p className="text-lg font-semibold text-brand-black dark:text-white">
                Algo salió mal
              </p>
              <p className="mt-1 text-sm font-light text-brand-blue-gray">
                {this.state.error?.message ?? 'Error desconocido'}
              </p>
            </div>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="rounded-[10px] bg-brand-black px-4 py-2 text-sm font-semibold text-white transition-all duration-400 ease-out hover:bg-brand-blue-gray active:scale-[0.98] dark:bg-white dark:text-brand-black"
            >
              Reintentar
            </button>
          </div>
        )
      )
    }
    return this.props.children
  }
}
