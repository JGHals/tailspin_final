"use client"

import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface SocialLoginButtonProps {
  provider: "google" | "facebook" | "apple"
  onClick: () => void
  isLoading: boolean
  disabled?: boolean
  children: ReactNode
}

export function SocialLoginButton({
  provider,
  onClick,
  isLoading,
  disabled = false,
  children,
}: SocialLoginButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      className={`w-full flex items-center justify-center gap-2 ${
        provider === "apple"
          ? "bg-black text-white hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          : provider === "facebook"
            ? "bg-[#1877F2] text-white hover:bg-[#166FE5] dark:bg-[#1877F2] dark:text-white dark:hover:bg-[#166FE5]"
            : ""
      }`}
      onClick={onClick}
      disabled={isLoading || disabled}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
    </Button>
  )
}
