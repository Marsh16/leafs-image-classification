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
import { nanoid } from "nanoid";

export default function Home() {
  // Call all hooks unconditionally
  const [mounted, setMounted] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [history, setHistory] = useState<LeafHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Thinking...");
  const [isModelReloading, setIsModelReloading] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(formatDateTime(new Date()));
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const { width, height } = useWindowSize();
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Effects - also unconditional
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(formatDateTime(new Date()));
    }, 1000);

    const stored = sessionStorage.getItem("predictionHistory");
    if (stored) {
      setHistory(JSON.parse(stored));
    }

    setMounted(true);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const savedSessionId = localStorage.getItem("plant_doctor_session_id");
    const savedMessages = localStorage.getItem("plant_doctor_messages");

    if (savedSessionId && savedMessages) {
      setSessionId(savedSessionId);
      setMessages(JSON.parse(savedMessages));
    }
  }, []);

  useEffect(() => {
    if (sessionId && messages.length > 0) {
      localStorage.setItem("plant_doctor_session_id", sessionId);
      localStorage.setItem("plant_doctor_messages", JSON.stringify(messages));
    }
  }, [sessionId, messages]);

  // Return early only after all hooks
  if (!mounted) return null;

  // Handlers

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

          setMessages((prev) => [
            ...prev,
            { id: nanoid(), role: "user", content: `${imageSrc}` },
          ]);

          try {
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
              const lines = chunk.split("\n");

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const data = line.slice(6);
                  if (data === "[DONE]") break;

                  try {
                    const parsed = JSON.parse(data);

                    if (parsed.status === "loading") {
                      setLoadingMessage(parsed.message);
                      const isReloading =
                        parsed.message.toLowerCase().includes("model is starting") ||
                        parsed.message.toLowerCase().includes("model is still loading") ||
                        parsed.message.toLowerCase().includes("cloud deployment");
                      setIsModelReloading(isReloading);
                    } else if (parsed.status === "complete") {
                      finalResult = {
                        class: parsed.class,
                        confidence: parsed.confidence,
                      };
                      setLoadingMessage("Processing complete!");
                      setIsModelReloading(false);
                    } else if (parsed.status === "error") {
                      throw new Error(parsed.error);
                    }
                  } catch (parseError) {
                    console.warn("Failed to parse streaming data:", parseError);
                  }
                }
              }
            }

            if (finalResult) {
              const entry: LeafHistoryItem = {
                image: imageSrc,
                class: finalResult.class,
                confidence: finalResult.confidence,
                timestamp: new Date().toISOString(),
              };

              setPrediction(entry.class);
              setConfidence(entry.confidence);

              const updatedHistory = [entry, ...history];
              setHistory(updatedHistory);

              try {
                sessionStorage.setItem("predictionHistory", JSON.stringify(updatedHistory));
              } catch (e) {
                if (
                  e instanceof DOMException &&
                  (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED")
                ) {
                  console.warn("Session storage full. Clearing history.");
                  sessionStorage.removeItem("predictionHistory");
                } else {
                  console.error("Failed to write to sessionStorage", e);
                }
              }

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

            // fallback non-streaming request
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

  const handleLlmQuestion = async () => {
    if (!question) {
      alert("Please provide a question.");
      return;
    }

    setMessages((prev) => [
      ...prev,
      { id: nanoid(), role: "user", content: question },
    ]);
    setQuestion("");
    setLoading(true);

    try {
      const response = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          disease_name: prediction,
          questions: question.trim(),
          session_id: sessionId,
        }),
      });

      if (!response.ok || !response.body) throw new Error("Streaming failed");

      const newSessionId = response.headers.get("X-Session-ID");
      if (newSessionId && newSessionId !== sessionId) {
        setSessionId(newSessionId);
      }

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

  // Show confetti only when healthy leaf with high confidence
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
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-teal-50 dark:from-slate-800 dark:to-slate-700 border border-teal-200 dark:border-teal-800 flex items-center justify-center shadow-sm">
              <div className="w-6 h-6 border-2 border-teal-400 rounded border-dashed"></div>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-700 to-teal-600 dark:from-slate-300 dark:to-teal-400 bg-clip-text text-transparent">
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
        {/* Chat/Upload Area */}
        <div className="lg:col-span-3 space-y-6">
          {messages.length === 0 ? (
            <div className="glass-strong rounded-3xl p-8 md:p-12 text-center bento-item">
              <div className="max-w-2xl mx-auto">
                <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-slate-100 to-teal-50 dark:from-slate-800 dark:to-slate-700 border border-teal-200 dark:border-teal-800 flex items-center justify-center shadow-lg">
                  <div className="w-10 h-10 border-2 border-teal-400 rounded-xl border-dashed"></div>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
                  Plant Disease Detection
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
                  Advanced leaf analysis powered by machine learning
                </p>
                <UploadInterface onUpload={handleImageUpload} />
              </div>
            </div>
          ) : (
            <>
              <div className="glass flex-1 overflow-y-auto py-4 rounded-3xl p-6 bento-item">
                <div className="space-y-4 px-4">
                  {messages.map((msg, idx) => (
                    <ChatMessage key={idx} message={msg} />
                  ))}

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

              <div className="glass flex-1 overflow-y-auto py-4 rounded-3xl p-6 bento-item">
                <div className="space-y-4 px-4">
                  <ChatInterface
                    question={question}
                    setQuestion={setQuestion}
                    onSend={handleLlmQuestion}
                    onUpload={handleImageUpload}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass rounded-3xl p-6 bento-item">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-100 to-teal-50 dark:from-slate-800 dark:to-slate-700 border border-teal-200 dark:border-teal-800 flex items-center justify-center">
                <div className="w-4 h-4 border border-teal-400 rounded"></div>
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
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-slate-300 dark:border-slate-600 rounded-lg border-dashed"></div>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No scans yet
                  </p>
                </div>
              )}
            </div>
          </div>

          {history.length > 0 && (
            <div className="glass rounded-3xl p-6 bento-item">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-100 to-teal-50 dark:from-slate-800 dark:to-slate-700 border border-teal-200 dark:border-teal-800 flex items-center justify-center">
                  <div className="w-4 h-4 border border-teal-400 rounded-sm"></div>
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                  Quick Stats
                </h3>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Total Scans
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {history.length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Healthy Leaves
                  </span>
                  <span className="font-bold text-teal-600 dark:text-teal-400">
                    {history.filter((h) => h.class === "Healthy").length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Avg Confidence
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {Math.round(
                      history.reduce((acc, h) => acc + h.confidence, 0) / history.length
                    )}
                    %
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          numberOfPieces={250}
          recycle={false}
          colors={["#14b8a6", "#0d9488", "#64748b", "#f59e0b"]}
        />
      )}

      <Footer />
    </main>
  );
}
