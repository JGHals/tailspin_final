"use client"

import { useAuth } from "@/lib/hooks/useAuth"

export default function EndlessModePage() {
  const { user } = useAuth()

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Endless Mode</h1>
      {!user ? (
        <p>Please sign in to play Endless Mode</p>
      ) : (
        <p>Endless Mode coming soon...</p>
      )}
    </div>
  )
} 