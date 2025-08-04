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
import { ModelLoadingIndicator } from "./components/ModelLoadingIndicator";
import { nanoid } from "nanoid"; // you may need to install this if you haven’t

export default function Home() {
  // State management
  const [mounted, setMounted] = useState<boolean>(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [history, setHistory] = useState<LeafHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("Thinking...");
  const [isModelReloading, setIsModelReloading] = useState<boolean>(false);
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
            // Send streaming prediction request
            const response = await fetch("/api/predict", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ data: base64String, stream: true }),
            });

            if (!response.ok || !response.body) {
              throw new Error("Streaming failed");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let finalResult: PredictionResult | null = null;

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') break;

                  try {
                    const parsed = JSON.parse(data);

                    if (parsed.status === 'loading') {
                      setLoadingMessage(parsed.message);
                      // Check if model is reloading based on message content
                      const isReloading = parsed.message.toLowerCase().includes('model is starting') ||
                                        parsed.message.toLowerCase().includes('model is still loading') ||
                                        parsed.message.toLowerCase().includes('cloud deployment');
                      setIsModelReloading(isReloading);
                    } else if (parsed.status === 'complete') {
                      finalResult = {
                        class: parsed.class,
                        confidence: parsed.confidence,
                      };
                      setLoadingMessage("Processing complete!");
                      setIsModelReloading(false);
                    } else if (parsed.status === 'error') {
                      throw new Error(parsed.error);
                    }
                  } catch (parseError) {
                    console.warn("Failed to parse streaming data:", parseError);
                  }
                }
              }
            }

            if (finalResult) {
              // Create new history entry
              const entry: LeafHistoryItem = {
                image: imageSrc,
                class: finalResult.class,
                confidence: finalResult.confidence,
                timestamp: new Date().toISOString(),
              };

              // Update state with prediction results
              setPrediction(entry.class);
              setConfidence(entry.confidence);

              // Update history
              const updatedHistory = [entry, ...history];
              setHistory(updatedHistory);

              try {
                sessionStorage.setItem(
                  "predictionHistory",
                  JSON.stringify(updatedHistory)
                );
              } catch (e) {
                if (
                  e instanceof DOMException &&
                  (e.name === "QuotaExceededError" ||
                    e.name === "NS_ERROR_DOM_QUOTA_REACHED")
                ) {
                  console.warn("Session storage full. Clearing history.");
                  sessionStorage.removeItem("predictionHistory");
                } else {
                  console.error("Failed to write to sessionStorage", e);
                }
              }

              // Add assistant response
              setMessages((prev) => [
                ...prev,
                {
                  id: nanoid(),
                  role: "assistant",
                  content: `This leaf is likely ${finalResult!.class} with ${finalResult!.confidence}% confidence.`,
                },
              ]);
            }
          } catch (error) {
            console.error("Error uploading image:", error);
            // Fallback to non-streaming request
            try {
              const fallbackResponse = await fetch("/api/predict", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: base64String }),
              });

              const result = (await fallbackResponse.json()) as PredictionResult;

              if (fallbackResponse.ok) {
                const entry: LeafHistoryItem = {
                  image: imageSrc,
                  class: result.class,
                  confidence: result.confidence,
                  timestamp: new Date().toISOString(),
                };

                setPrediction(entry.class);
                setConfidence(entry.confidence);
                setHistory([entry, ...history]);

                setMessages((prev) => [
                  ...prev,
                  {
                    id: nanoid(),
                    role: "assistant",
                    content: `This leaf is likely ${result.class} with ${result.confidence}% confidence.`,
                  },
                ]);
              }
            } catch (fallbackError) {
              console.error("Fallback request also failed:", fallbackError);
            }
          } finally {
            setLoading(false);
            setLoadingMessage("Thinking...");
            setIsModelReloading(false);
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
    <main className="min-h-screen p-4 md:p-6 lg:p-8">
      {/* Header */}
      <header className="glass-strong rounded-3xl p-6 mb-8 bento-item">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-2xl">
              🍃
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 dark:from-emerald-400 dark:to-cyan-400 bg-clip-text text-transparent">
                Leafs.ai
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                AI-Powered Plant Disease Detection
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Clock className="w-4 h-4" />
              {currentDateTime}
            </div>
            <ModeToggle />
          </div>
        </div>
      </header>

      {/* Main Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        {/* Chat/Upload Area - Takes 3 columns on large screens */}
        <div className="lg:col-span-3 space-y-6">
          {/* Welcome message or Chat messages */}
          {messages.length === 0 ? (
            <div className="glass-strong rounded-3xl p-8 md:p-12 text-center bento-item">
              <div className="max-w-2xl mx-auto">
                <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-emerald-400 via-cyan-400 to-blue-400 flex items-center justify-center text-4xl">
                  👨‍🌾
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
                  Hello Farmer!
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
                  Upload a mango leaf image to detect diseases and get expert advice
                </p>
                <UploadInterface onUpload={handleImageUpload} />
              </div>
            </div>
          ) : (
            <>
              {/* Chat Messages */}
              <div className="glass rounded-3xl p-6 bento-item">
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {messages.map((msg, idx) => (
                    <ChatMessage key={idx} message={msg} />
                  ))}

                  {/* Loading indicator */}
                  {loading && (
                    <div className="flex justify-center w-full">
                      <ModelLoadingIndicator
                        message={loadingMessage}
                        isModelReloading={isModelReloading}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Chat Input */}
              <div className="glass rounded-3xl p-6 bento-item">
                <ChatInterface
                  question={question}
                  setQuestion={setQuestion}
                  onSend={handleLlmQuestion}
                  onUpload={handleImageUpload}
                />
              </div>
            </>
          )}
        </div>

        {/* Sidebar - History and Stats */}
        <div className="lg:col-span-1 space-y-6">
          {/* History Section */}
          <div className="glass rounded-3xl p-6 bento-item">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-lg">
                🔮
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                Recent Scans
              </h3>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {history.slice(0, 5).map((item, index) => (
                <PastLeafCard key={index} item={item} index={index} />
              ))}

              {history.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl">
                    🌱
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No scans yet
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Stats Card */}
          {history.length > 0 && (
            <div className="glass rounded-3xl p-6 bento-item">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-400 flex items-center justify-center text-lg">
                  📊
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                  Quick Stats
                </h3>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Total Scans</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{history.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Healthy Leaves</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {history.filter(h => h.class === 'Healthy').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Avg Confidence</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {Math.round(history.reduce((acc, h) => acc + h.confidence, 0) / history.length)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confetti effect for healthy leaves */}
      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          numberOfPieces={250}
          recycle={false}
          colors={["#10b981", "#06b6d4", "#8b5cf6", "#f59e0b"]}
        />
      )}

      <Footer />
    </main>
  );
}
