"use client"

import { ReactNode } from "react"
import { LoadingSpinner } from "./loading-spinner"
import { Alert, AlertDescription } from "./alert"
import { AlertCircle } from "lucide-react"

interface LoadingStateProps {
  loading: boolean
  error?: string | null
  isEmpty?: boolean
  emptyMessage?: string
  loadingMessage?: string
  children: ReactNode
}

export function LoadingState({
  loading,
  error,
  isEmpty,
  emptyMessage = "No data available",
  loadingMessage = "Loading...",
  children
}: LoadingStateProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner message={loadingMessage} />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (isEmpty) {
    return (
      <Alert>
        <AlertDescription>{emptyMessage}</AlertDescription>
      </Alert>
    )
  }

  return <>{children}</>
} 