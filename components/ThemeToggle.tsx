"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Sun, Moon } from "lucide-react"

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return <div className="h-8 w-14 rounded-full bg-muted animate-pulse" />
  }

  const isDark = resolvedTheme === "dark"

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="group relative flex h-8 w-14 items-center rounded-full bg-muted/80 p-0.5 transition-colors duration-500 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {/* Sliding pill */}
      <span
        className={`absolute top-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-background shadow-sm transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          isDark ? "left-[calc(100%-1.875rem)]" : "left-0.5"
        }`}
      >
        {isDark ? (
          <Moon className="h-3.5 w-3.5 text-primary transition-transform duration-500 rotate-0" />
        ) : (
          <Sun className="h-3.5 w-3.5 text-primary transition-transform duration-500 rotate-0" />
        )}
      </span>

      {/* Background icons (faded, opposite side) */}
      <Sun className={`absolute left-1.5 h-3 w-3 transition-opacity duration-300 ${isDark ? "opacity-30 text-muted-foreground" : "opacity-0"}`} />
      <Moon className={`absolute right-1.5 h-3 w-3 transition-opacity duration-300 ${isDark ? "opacity-0" : "opacity-30 text-muted-foreground"}`} />
    </button>
  )
}
