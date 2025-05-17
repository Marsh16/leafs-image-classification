"use client";

import { useRef } from "react";
import { Card } from "./ui/Card";
import { Button } from "./ui/button";

interface ChatInterfaceProps {
  question: string;
  setQuestion: (question: string) => void;
  onSend: () => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ChatInterface = ({ 
  question, 
  setQuestion, 
  onSend, 
  onUpload 
}: ChatInterfaceProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  return (
    <Card className="w-full max-w-3xl p-6 bg-white dark:bg-zinc-800 shadow-lg space-y-4">
      <div className="flex items-end gap-2">
        <label className="cursor-pointer text-zinc-500 hover:text-cyan-500 text-2xl">
          📤
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onUpload}
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
          onClick={onSend}
          className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold px-4 py-2 rounded-lg"
        >
          Send
        </Button>
      </div>
    </Card>
  );
};