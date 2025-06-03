"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div>
          <div className="font-medium">Theme</div>
          <div className="text-sm text-muted-foreground">Switch between light and dark mode</div>
        </div>
        <Button variant="outline" size="icon" className="h-10 w-10" disabled>
          <Sun className="h-4 w-4" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
    )
  }

  const isDark = resolvedTheme === "dark"

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div>
        <div className="font-medium">Theme</div>
        <div className="text-sm text-muted-foreground">Currently using {isDark ? "dark" : "light"} mode</div>
      </div>
      <Button variant="outline" size="icon" onClick={() => setTheme(isDark ? "light" : "dark")} className="h-10 w-10">
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        <span className="sr-only">Toggle theme</span>
      </Button>
    </div>
  )
}
