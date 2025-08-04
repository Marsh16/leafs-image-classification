"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";

export function ModeToggle() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <button
      onClick={toggleTheme}
      className="glass-subtle rounded-2xl p-3 hover:scale-105 transition-all duration-300 group"
    >
      <div className="w-8 h-8 flex items-center justify-center">
        {theme === "light" ? (
          <Moon className="h-5 w-5 text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors" />
        ) : (
          <Sun className="h-5 w-5 text-yellow-500 group-hover:text-yellow-400 transition-colors" />
        )}
      </div>
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
