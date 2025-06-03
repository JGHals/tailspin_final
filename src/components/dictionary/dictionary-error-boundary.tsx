import { Component, ErrorInfo, ReactNode } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw } from "lucide-react"
import { dictionaryLoader } from "@/lib/dictionary/dictionary-loader"

interface Props {
  children: ReactNode
  onRetry?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
  retryCount: number
}

const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second

export class DictionaryErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    retryCount: 0
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Dictionary error:", error, errorInfo)
  }

  private handleRetry = async () => {
    const { retryCount } = this.state
    
    if (retryCount >= MAX_RETRIES) {
      this.setState({ 
        error: new Error("Maximum retry attempts reached. Please refresh the page."),
        hasError: true 
      })
      return
    }

    this.setState({ retryCount: retryCount + 1 })

    try {
      // Clear dictionary cache
      dictionaryLoader.clearCaches()
      
      // Wait for retry delay
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
      
      // Attempt to reinitialize with force reload
      await dictionaryLoader.initialize(true)
      
      // Reset error state if successful
      this.setState({ hasError: false, error: null })
      
      // Call onRetry prop if provided
      this.props.onRetry?.()
    } catch (err) {
      this.setState({ 
        error: err instanceof Error ? err : new Error("Failed to reload dictionary"),
        hasError: true 
      })
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-4">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Dictionary Error</AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-2">{this.state.error?.message || "Failed to load dictionary"}</p>
              <p className="text-sm text-muted">Retry attempt: {this.state.retryCount + 1} of {MAX_RETRIES}</p>
            </AlertDescription>
          </Alert>
          
          <Button
            variant="outline"
            className="mt-4"
            onClick={this.handleRetry}
            disabled={this.state.retryCount >= MAX_RETRIES}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {this.state.retryCount >= MAX_RETRIES ? "Please refresh page" : "Try Again"}
          </Button>
        </div>
      )
    }

    return this.props.children
  }
} 