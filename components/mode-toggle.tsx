"use client"

import { Moon } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "./ui/button"

export function ModeToggle() {
  const { setTheme, theme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light")
  }

  return (
    <Button variant="outline" size="icon" onClick={toggleTheme} className="rounded-lg bg-zinc-200 dark:bg-zinc-700">
      <Moon className="h-5 w-5" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
