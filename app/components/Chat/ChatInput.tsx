// app/components/Chat/ChatInput.tsx
"use client";
import { useState } from "react";
import { Message } from "@/app/types";
import { Button } from "../ui/button";

interface ChatInputProps {
  prediction: string;
  onMessage: (message: Message) => void;
}

export default function ChatInput({ prediction, onMessage }: ChatInputProps) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!question) return alert("Please provide a question.");
    onMessage({ role: "user", content: question });
    setQuestion("");
    setLoading(true);

    try {
      const response = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disease_name: prediction, questions: question }),
      });

      const result = await response.json();

      if (response.ok) {
        onMessage({ role: "assistant", content: result.response });
      } else {
        onMessage({
          role: "assistant",
          content: "Sorry, I couldn't fetch a response at the moment.",
        });
      }
    } catch {
      onMessage({
        role: "assistant",
        content: "Sorry, something went wrong.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto mb-4">
      <div className="flex items-end gap-2">
        <textarea
          placeholder="Ask a question about the disease..."
          className="flex-grow resize-none rounded-lg p-3 text-sm bg-zinc-100 dark:bg-zinc-900 text-black dark:text-white border border-zinc-300 dark:border-zinc-700 font-mono"
          rows={2}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <Button
          onClick={handleSend}
          disabled={loading}
          className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold px-4 py-2 rounded-lg"
        >
          {loading ? "..." : "Send"}
        </Button>
      </div>
    </div>
  );
}
