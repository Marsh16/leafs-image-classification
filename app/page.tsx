// app/page.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import HistorySidebar from "./components/Sidebar/HistorySidebar";
import UploadCard from "./components/Upload/UploadCard";
import ChatWindow from "./components/Chat/ChatWindow";
import ChatInput from "./components/Chat/ChatInput";
import { formatDateTime } from "./lib/formatDateTime";
import { PredictionHistoryItem, Message } from "./types";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<PredictionHistoryItem[]>(() => {
    const stored = sessionStorage.getItem("predictionHistory");
    return stored ? JSON.parse(stored) : [];
  });
  const [currentDateTime, setCurrentDateTime] = useState<string>("");

  useEffect(() => {
    const updateDateTime = () => setCurrentDateTime(formatDateTime(new Date()));
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleNewMessage = (newMessage: Message) => {
    setMessages((prev) => [...prev, newMessage]);
  };

  const MAX_HISTORY_ITEMS = 20;

  const handleNewPrediction = (prediction: PredictionHistoryItem) => {
    const updatedHistory = [prediction, ...history].slice(0, MAX_HISTORY_ITEMS);
    setHistory(updatedHistory);
    try {
      sessionStorage.setItem(
        "predictionHistory",
        JSON.stringify(updatedHistory)
      );
    } catch (e) {
      console.error("Failed to save prediction history:", e);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-gradient-to-br from-cyan-600 to-blue-400 dark:from-cyan-800 dark:to-blue-900">
      <HistorySidebar history={history} currentDateTime={currentDateTime} />
      <main className="flex-1 flex flex-col p-4">
        <UploadCard
          onPrediction={handleNewPrediction}
          onMessage={handleNewMessage}
        />
        <ChatWindow messages={messages} />
        <ChatInput
          prediction={history[0]?.class || ""}
          onMessage={handleNewMessage}
        />
      </main>
    </div>
  );
}
