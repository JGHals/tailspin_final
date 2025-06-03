import { ReactNode, useEffect } from 'react'
import { AuthProvider } from '@/lib/contexts/AuthContext'
import { DictionaryProvider } from '@/lib/contexts/dictionary-context'
import { GameProvider } from '@/lib/contexts/game-context'
import { useGame } from '@/lib/contexts/game-context'
import { useAuth } from '@/lib/hooks/useAuth'
import { useDictionary } from '@/lib/contexts/dictionary-context'

interface TestWrapperProps {
  children: ReactNode
  onContextsReady?: () => void
}

function TestWrapperInner({ onContextsReady }: { onContextsReady?: () => void }) {
  const { isLoading: gameLoading, gameState } = useGame()
  const { isReady: isDictionaryReady } = useDictionary()
  const { user, profile } = useAuth()

  useEffect(() => {
    // Signal that contexts are ready when all conditions are met
    if (onContextsReady && !gameLoading && gameState && isDictionaryReady && user && profile) {
      onContextsReady()
    }
  }, [onContextsReady, gameLoading, gameState, isDictionaryReady, user, profile])

  return null
}

export function TestWrapper({ children, onContextsReady }: TestWrapperProps) {
  return (
    <AuthProvider>
      <DictionaryProvider>
        <GameProvider>
          <TestWrapperInner onContextsReady={onContextsReady} />
          {children}
        </GameProvider>
      </DictionaryProvider>
    </AuthProvider>
  )
} 