"use client";

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
  const [question, setQuestion] = useState<string>("");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>(
    []
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
          const imageSrc = event.target.result as string;

          setCurrentImage(imageSrc);
          setPrediction(null);
          setConfidence(null);
          setLoading(true);

          setMessages((prev) => [
            ...prev,
            { role: "user", content: `${imageSrc}` },
          ]);

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
                image: imageSrc,
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

              setMessages((prev) => [
                ...prev,
                {
                  role: "assistant",
                  content: `This leaf is likely ${result.class} with ${result.confidence}% confidence.`,
                },
              ]);
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

  const handleLlmQuestion = async () => {
    if (!question) {
      alert("Please provide a question.");
      return;
    }

    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setQuestion("");
    setLoading(true);

    try {
      const response = await fetch(
        "https://leafs-ai.vercel.app/api/questions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            disease_name: prediction,
            questions: question,
          }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: result.response },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, I couldn't fetch a response at the moment.",
          },
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen bg-gradient-to-br from-purple-600 to-blue-400 dark:from-purple-800 dark:to-blue-900">
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
            <h1 className="text-3xl font-bold text-white">Leafs.ai 🍃✨</h1>
          </div>

          <div className="flex items-center">
            <ModeToggle />
          </div>
        </div>

        {messages.length == 0 && (
          <div className="text-center mb-16 text-white">
            <h2 className="text-2xl font-mono mb-2">Hello Farmer 👨‍🌾</h2>
            <p className="text-xl font-mono">Drop a mango leaf for vibes 🍵</p>
          </div>
        )}

        <div className="flex flex-col items-center">
          {/* Chat UI */}
          <div className="w-full max-w-3xl py-6 space-y-3">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg font-mono text-sm max-w-[85%] whitespace-pre-line ${
                  msg.role === "user"
                    ? "ml-auto bg-purple-600 text-white"
                    : "bg-zinc-100 dark:bg-zinc-700 text-black dark:text-white"
                }`}
              >
                {msg.content.startsWith("data:image/") &&
                msg.content.includes("base64,") ? (
                  <div className="mb-6 flex justify-center">
                    <Image
                      src={msg.content}
                      alt="Uploaded Leaf"
                      width={300}
                      height={300}
                      className="rounded-lg shadow-lg border border-zinc-300 dark:border-zinc-700"
                    />
                  </div>
                ) : (
                  <div
                    className={`p-3 rounded-lg font-mono text-sm max-w-[85%] whitespace-pre-line ${
                      msg.role === "user"
                        ? "ml-auto bg-purple-600 text-white"
                        : "bg-zinc-100 dark:bg-zinc-700 text-black dark:text-white"
                    }`}
                  >
                    {msg.content}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="text-sm text-zinc-500 animate-pulse font-mono">
                Thinking...
              </div>
            )}
          </div>

          {messages.length == 0 ? (
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
          ) : (
            <Card className="w-full max-w-3xl p-6 bg-white dark:bg-zinc-800 shadow-lg space-y-4">
              <div className="flex items-end gap-2">
                <label className="cursor-pointer text-zinc-500 hover:text-purple-500">
                  📤
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    ref={fileInputRef}
                  />
                </label>

                <textarea
                  placeholder="Ask a question about the disease..."
                  className="flex-grow resize-none rounded-lg p-3 text-sm bg-zinc-100 dark:bg-zinc-900 text-black dark:text-white border border-zinc-300 dark:border-zinc-700 font-mono"
                  rows={2}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                />

                <Button
                  onClick={handleLlmQuestion}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-lg"
                >
                  Send
                </Button>
              </div>
            </Card>
          )}

          {/* Confetti */}
          {prediction?.toLowerCase().includes("healthy") &&
            confidence &&
            confidence > 75 && (
              <Confetti
                width={width}
                height={height}
                numberOfPieces={250}
                recycle={false}
                colors={["#00F2B4", "#FF77FF", "#6B5B95", "#5DD6F5"]}
              />
            )}
        </div>

        <Footer />
      </section>
    </main>
  );
}
