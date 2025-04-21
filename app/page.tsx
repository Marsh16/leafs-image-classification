"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Clock } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/Card";
import { Footer } from "@/components/Footer";
import Confetti from "react-confetti";
import useWindowSize from "./useWindowSize";

export default function Home() {
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState<string>(
    formatDateTime(new Date())
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { width, height } = useWindowSize();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(formatDateTime(new Date()));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const stored = sessionStorage.getItem("predictionHistory");
    if (stored) {
      setHistory(JSON.parse(stored));
    }
  }, []);

  function formatDateTime(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
      month: "long",
      day: "numeric",
      year: "numeric",
    };
    const formattedDate = date.toLocaleDateString("en-US", options);
    const formattedTime = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    return `${formattedDate} • ${formattedTime}`;
  }

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();

      reader.onload = async (event) => {
        if (event.target?.result) {
          const base64String = (event.target.result as string).split(",")[1];
          setCurrentImage(event.target.result as string);
          setPrediction(null);
          setConfidence(null);
          setLoading(true);

          try {
            const response = await fetch(
              "https://leafs-ai.vercel.app/api/predict",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: base64String }),
              }
            );

            const result = await response.json();

            if (response.ok) {
              const entry = {
                image: event.target.result,
                class: result.class,
                confidence: result.confidence,
                timestamp: new Date().toISOString(),
              };

              setPrediction(entry.class);
              setConfidence(entry.confidence);

              const updatedHistory = [entry, ...history];
              setHistory(updatedHistory);
              sessionStorage.setItem(
                "predictionHistory",
                JSON.stringify(updatedHistory)
              );
            } else {
              console.error("Prediction error:", result.error);
            }
          } catch (error) {
            console.error("Error uploading image:", error);
          } finally {
            setLoading(false);
          }
        }
      };

      reader.readAsDataURL(file);
    }
  };

  return (
    <main className="flex min-h-screen bg-gradient-to-br from-purple-600 to-blue-400 dark:bg-gradient-to-br dark:from-purple-800 dark:to-blue-900">
      {/* Sidebar */}
      <aside className="w-full md:w-1/4 bg-white dark:bg-zinc-900 p-4 overflow-y-auto border-r border-zinc-300 dark:border-zinc-700">
        <h2 className="text-lg font-bold mb-4 text-center text-black dark:text-white">
          🔮 Past Leafs
        </h2>
        <div className="space-y-4">
          {history.map((item, index) => (
            <Card
              key={index}
              className="p-3 bg-zinc-100 dark:bg-zinc-800 shadow-md hover:shadow-xl transition duration-300"
            >
              <div className="flex gap-2 items-center">
                <Image
                  src={item.image}
                  alt={`Leaf ${index}`}
                  width={60}
                  height={45}
                  className="rounded-lg"
                />
                <div>
                  <p className="text-sm font-mono text-blue-600 dark:text-blue-400">
                    <strong>{item.class}</strong>
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {item.confidence}% •{" "}
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
        <div className="fixed bottom-5 left-5 z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-full px-4 py-2 shadow-md flex items-center">
            <Clock className="w-4 h-4 mr-2 text-zinc-500 dark:text-zinc-400" />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              {currentDateTime}
            </span>
          </div>
        </div>
      </aside>

      <section className="flex-1 p-6">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-white">
              Leafs.ai 🍃✨
            </h1>
          </div>

          <div className="flex items-center">
            <ModeToggle />
          </div>
        </div>

        <div className="flex flex-col items-center">
          {!currentImage ? (
            <div className="text-center mb-16 text-white">
              <h2 className="text-2xl font-mono mb-2">Hello Farmer 👨‍🌾</h2>
              <p className="text-xl font-mono">Drop a mango leaf for vibes 🍵</p>
            </div>
          ) : (
            <div className="flex flex-col items-center mb-8">
              <div className="rounded-3xl overflow-hidden mb-6 bg-white p-4 shadow-md">
                <Image
                  src={currentImage}
                  alt="Uploaded leaf"
                  width={400}
                  height={300}
                  className="rounded-2xl"
                />
              </div>
              {prediction && confidence && (
                <div className="text-center max-w-md font-mono text-white">
                  <p>
                    This leaf is likely <strong>{prediction}</strong> 🍃
                    <br />
                    Confidence? <strong>{confidence}%</strong>
                  </p>

                  {/* Confetti Only for Healthy Leaf Predictions */}
                  {prediction.toLowerCase().includes("healthy") &&
                    confidence > 75 && (
                      <Confetti
                        width={width}
                        height={height}
                        numberOfPieces={250}
                        recycle={false}
                        colors={["#00F2B4", "#FF77FF", "#6B5B95", "#5DD6F5"]}
                      />
                    )}

                  {/* Slay message when healthy */}
                  {prediction.toLowerCase().includes("healthy") && (
                    <p className="mt-2 text-green-500 dark:text-green-300 animate-pulse">
                      This leaf is totally fine. Slay, nature queen 🌿💅
                    </p>
                  )}
                </div>
              )}

              {loading && (
                <div className="text-center mt-4 text-white font-mono animate-pulse">
                  Hold up... we’re vibing your leaf 🌈
                </div>
              )}
            </div>
          )}

          {/* Upload Card */}
          <Card className="w-full max-w-md p-4 flex items-center justify-between bg-white dark:bg-zinc-800">
            <label className="text-zinc-500 dark:text-zinc-400 font-mono cursor-pointer flex-grow">
              Upload that 🍃 pic
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                ref={fileInputRef}
              />
            </label>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              onClick={handleClick}
            >
              <span className="text-2xl">📤</span>
            </Button>
          </Card>
        </div>

        <Footer />
      </section>
    </main>
  );
}
