"use client"

import { useAuth } from "@/lib/hooks/useAuth"

export default function SettingsPage() {
  const { user } = useAuth()

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      {!user ? (
        <p>Please sign in to access settings</p>
      ) : (
        <p>Settings coming soon...</p>
      )}
    </div>
  )
} 