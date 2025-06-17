"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import Confetti from "react-confetti";
import { LeafHistoryItem, PredictionResult } from "./types";
import { formatDateTime } from "./lib/dateUtils";
import { Message } from "ai";
import useWindowSize from "./hooks/useWindowSize";
import { PastLeafCard } from "./components/PastLeafCard";
import { ModeToggle } from "./components/mode-toggle";
import { ChatMessage } from "./components/ChatMessage";
import { UploadInterface } from "./components/UploadInterface";
import { ChatInterface } from "./components/ChatInterface";
import { Footer } from "./components/Footer";
import { nanoid } from "nanoid"; // you may need to install this if you haven’t

export default function Home() {
  // State management
  const [mounted, setMounted] = useState<boolean>(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [history, setHistory] = useState<LeafHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentDateTime, setCurrentDateTime] = useState<string>(
    formatDateTime(new Date())
  );
  const [question, setQuestion] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);

  const { width, height } = useWindowSize();

  // Initialize component
  useEffect(() => {
    // Update time every second
    const timer = setInterval(() => {
      setCurrentDateTime(formatDateTime(new Date()));
    }, 1000);

    // Load prediction history from session storage
    const stored = sessionStorage.getItem("predictionHistory");
    if (stored) {
      setHistory(JSON.parse(stored));
    }

    // Set mounted state to allow rendering
    setMounted(true);

    return () => clearInterval(timer);
  }, []);

  if (!mounted) return null; // Prevent SSR rendering

  // Handle image upload and prediction
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();

      reader.onload = async (event: ProgressEvent<FileReader>) => {
        if (event.target?.result) {
          const result = event.target.result as string;
          const base64String = result.split(",")[1];
          const imageSrc = result;

          setCurrentImage(imageSrc);
          setPrediction(null);
          setConfidence(null);
          setLoading(true);

          // Add image to messages
          setMessages((prev) => [
            ...prev,
            { id: nanoid(), role: "user", content: `${imageSrc}` },
          ]);

          try {
            // Send prediction request
            const response = await fetch(
              process.env.NEXT_PUBLIC_ENV === "development"
                ? "/api/predict"
                : "/api/predict",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: base64String }),
              }
            );

            const result = (await response.json()) as PredictionResult;

            if (response.ok) {
              // Create new history entry
              const entry: LeafHistoryItem = {
                image: imageSrc,
                class: result.class,
                confidence: result.confidence,
                timestamp: new Date().toISOString(),
              };

              // Update state with prediction results
              setPrediction(entry.class);
              setConfidence(entry.confidence);

              // Update history
              const updatedHistory = [entry, ...history];
              setHistory(updatedHistory);
              sessionStorage.setItem(
                "predictionHistory",
                JSON.stringify(updatedHistory)
              );

              // Add assistant response
              setMessages((prev) => [
                ...prev,
                {
                  id: nanoid(),
                  role: "assistant",
                  content: `This leaf is likely ${result.class} with ${result.confidence}% confidence.`,
                },
              ]);
            } else {
              console.error("Prediction error:", result);
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

  // Handle LLM question
  const handleLlmQuestion = async () => {
    if (!question) {
      alert("Please provide a question.");
      return;
    }

    // Add user question to messages
    setMessages((prev) => [
      ...prev,
      { id: nanoid(), role: "user", content: question },
    ]);
    setQuestion("");
    setLoading(true);

    // in handleLlmQuestion()

    try {
      const response = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          disease_name: prediction,
          questions: question,
        }),
      });

      if (!response.ok || !response.body) throw new Error("Streaming failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let fullText = "";
      const newMessageId = nanoid();
      setMessages((prev) => [
        ...prev,
        { id: newMessageId, role: "assistant", content: "" },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === newMessageId ? { ...msg, content: fullText } : msg
          )
        );
      }
    } catch (error) {
      console.error("Streaming failed:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: nanoid(),
          role: "assistant",
          content: "Sorry, something went wrong while streaming.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Determine if confetti should be shown
  const showConfetti =
    prediction?.toLowerCase().includes("healthy") &&
    confidence &&
    confidence > 75;

  return (
    <main className="flex min-h-screen bg-gradient-to-br from-cyan-600 to-blue-400 dark:from-cyan-800 dark:to-blue-900">
      {/* Sidebar with history */}
      <aside className="w-full md:w-1/4 bg-white dark:bg-zinc-900 p-4 overflow-y-auto border-r border-zinc-300 dark:border-zinc-700">
        <h2 className="text-lg font-bold mb-4 text-center text-black dark:text-white">
          🔮 Past Leafs
        </h2>

        <div className="space-y-4">
          {history.map((item, index) => (
            <PastLeafCard key={index} item={item} index={index} />
          ))}
        </div>

        {/* Current date and time display */}
        <div className="fixed bottom-5 left-5 z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-full px-4 py-2 shadow-md flex items-center">
            <Clock className="w-4 h-4 mr-2 text-zinc-500 dark:text-zinc-400" />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              {currentDateTime}
            </span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <section className="flex-1 p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-white">Leafs.ai 🍃✨</h1>
          </div>
          <div className="flex items-center">
            <ModeToggle />
          </div>
        </div>

        {/* Welcome message */}
        {messages.length === 0 && (
          <div className="text-center mb-16 text-white">
            <h2 className="text-2xl font-mono mb-2">Hello Farmer 👨‍🌾</h2>
            <p className="text-xl font-mono">Drop a mango leaf for vibes 🍵</p>
          </div>
        )}

        <div className="flex flex-col items-center">
          {/* Chat messages display */}
          <div className="w-full max-w-3xl py-6 space-y-3">
            {messages.map((msg, idx) => (
              <ChatMessage key={idx} message={msg} />
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="text-sm text-zinc-500 animate-pulse font-mono">
                Thinking...
              </div>
            )}
          </div>

          {/* Input interface */}
          {messages.length === 0 ? (
            <UploadInterface onUpload={handleImageUpload} />
          ) : (
            <ChatInterface
              question={question}
              setQuestion={setQuestion}
              onSend={handleLlmQuestion}
              onUpload={handleImageUpload}
            />
          )}

          {/* Confetti effect for healthy leaves */}
          {showConfetti && (
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
