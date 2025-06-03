"use client"

import { useAuth } from "@/lib/hooks/useAuth"

export default function VersusModePage() {
  const { user } = useAuth()

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Versus Mode</h1>
      {!user ? (
        <p>Please sign in to play Versus Mode</p>
      ) : (
        <p>Versus Mode coming soon...</p>
      )}
    </div>
  )
} 