"use client";

import { useRef } from "react";

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
  onUpload,
}: ChatInterfaceProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="w-full max-w-4xl">
      <div className="flex items-end gap-4">
        {/* Upload Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="glass-subtle rounded-2xl p-4 hover:scale-105 transition-all duration-300 group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-teal-50 dark:from-slate-800 dark:to-slate-700 border border-teal-200 dark:border-teal-800 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm">
            <div className="w-5 h-5 border-2 border-teal-400 rounded border-dashed"></div>
          </div>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onUpload}
            ref={fileInputRef}
          />
        </button>

        {/* Text Input */}
        <div className="flex-grow glass-subtle rounded-2xl p-4">
          <textarea
            placeholder="Ask a question about the disease or upload another leaf..."
            className="w-full resize-none bg-transparent text-slate-800 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-400 border-none outline-none text-sm leading-relaxed"
            rows={2}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* Send Button */}
        <button
          onClick={onSend}
          disabled={!question.trim()}
          className="glass-subtle rounded-2xl p-4 bg-gradient-to-br from-teal-400 to-teal-500 hover:from-teal-500 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 group shadow-sm"
        >
          <div className="w-10 h-10 flex items-center justify-center text-white font-bold group-hover:scale-110 transition-transform duration-300">
            →
          </div>
        </button>
      </div>
    </div>
  );
};
