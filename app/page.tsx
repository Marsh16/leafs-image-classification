"use client"

import type React from "react"

import { useState, useRef } from "react"
import Image from "next/image"
import { Clock } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import { cn } from "@/components/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/Card"
import { Footer } from "@/components/Footer"

export default function Home() {
  const [currentImage, setCurrentImage] = useState<string | null>(null)
  const [prediction, setPrediction] = useState<string | null>(null)
  const [confidence, setConfidence] = useState<number | null>(null)
  const [currentDateTime, setCurrentDateTime] = useState<string>(formatDateTime(new Date()))
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleClick = () => {
    fileInputRef.current?.click()
  }
  // Update the date and time every second
  useState(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(formatDateTime(new Date()))
    }, 1000)
    return () => clearInterval(timer)
  })

  function formatDateTime(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
      month: "long",
      day: "numeric",
      year: "numeric",
    }
    const formattedDate = date.toLocaleDateString("en-US", options)
    const formattedTime = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    return `${formattedDate} • ${formattedTime}`
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const reader = new FileReader()

      reader.onload = (event) => {
        if (event.target?.result) {
          setCurrentImage(event.target.result as string)
          // Simulate AI prediction
          setPrediction("Cutting Weevil")
          setConfidence(99.18)
        }
      }

      reader.readAsDataURL(file)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-zinc-100 dark:bg-zinc-800">
      <div className="w-full max-w-4xl p-4">
        <div className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6">
              <img src="" alt="" />
            </div>
            <h1 className="text-xl font-bold text-black dark:text-white">Leafs</h1>
          </div>

          <div className="bg-white dark:bg-zinc-800 rounded-full px-4 py-2 shadow-md flex items-center">
            <Clock className="w-4 h-4 mr-2 text-zinc-500 dark:text-zinc-400" />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">{currentDateTime}</span>
          </div>

          <ModeToggle />
        </div>

        <div className="flex flex-col items-center justify-center mt-16">
          {!currentImage ? (
            <div className="text-center mb-16">
              <h2 className="text-2xl font-mono mb-2">Hello,</h2>
              <p className="text-2xl font-mono">How may i assist you?</p>
            </div>
          ) : (
            <div className="flex flex-col items-center mb-8">
              <div className="rounded-3xl overflow-hidden mb-6 bg-white p-4 shadow-md">
                <Image
                  src={currentImage || "/placeholder.svg"}
                  alt="Uploaded leaf"
                  width={400}
                  height={300}
                  className="rounded-2xl"
                />
              </div>
              {prediction && confidence && (
                <p className="text-center max-w-md font-mono">
                  This image most likely belongs to {prediction} with a {confidence} percent confidence.
                </p>
              )}
            </div>
          )}

          <Card className={cn("w-full max-w-md p-4 flex items-center justify-between", "bg-white dark:bg-zinc-800")}>
            <label className="text-zinc-500 dark:text-zinc-400 font-mono cursor-pointer flex-grow">
              Input Image
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              onClick={handleClick}
            >
              <span className="text-2xl">+</span>
            </Button>
          </Card>
        </div>
      </div>

      <Footer></Footer>
    </main>
  )
}

