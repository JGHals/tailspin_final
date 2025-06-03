import type { FC } from "react"

interface GameLogoProps {
  className?: string
}

export const GameLogo: FC<GameLogoProps> = ({ className }) => {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 bg-blue-500 rounded-full opacity-70 blur-sm"></div>
      <div className="relative bg-white dark:bg-slate-900 rounded-full flex items-center justify-center h-full w-full border-2 border-blue-500">
        <span className="text-2xl font-bold text-blue-500">TS</span>
      </div>
    </div>
  )
}
