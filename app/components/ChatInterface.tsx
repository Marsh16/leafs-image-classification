"use client";

import { useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";

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
  const recognitionRef = useRef<any>(null);

  const [isListening, setIsListening] = useState(false);
  const [language, setLanguage] = useState("en-US");
  const [languageConfirmed, setLanguageConfirmed] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const startVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event);
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = question;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += (finalTranscript ? " " : "") + text;
        } else {
          interimTranscript += text;
        }
      }

      setQuestion(
        finalTranscript + (interimTranscript ? " " + interimTranscript : "")
      );
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const stopVoiceInput = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const toggleVoiceInput = () => {
    if (!languageConfirmed) {
      alert("Please choose your speaking language before using the mic.");
      return;
    }
    if (isListening) {
      stopVoiceInput();
    } else {
      startVoiceInput();
    }
  };

  return (
    <div className="w-full max-w-4xl space-y-3">
      {/* Language Selector */}
      <div className="flex flex-col items-end gap-1">
        <select
          value={language}
          onChange={(e) => {
            setLanguage(e.target.value);
            setLanguageConfirmed(true);
          }}
          className="glass-subtle rounded-xl px-3 py-2 text-sm outline-none cursor-pointer border border-teal-200 dark:border-teal-800"
        >
          <option value="en-US">English</option>
          <option value="id-ID">Bahasa Indonesia</option>
        </select>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Select language before speaking
        </span>
      </div>

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

        {/* Text + Voice Input */}
        <div className="flex-grow glass-subtle rounded-2xl px-4 py-2 flex items-center gap-2 relative">
          <textarea
            placeholder="Ask a question or speak into the mic..."
            className="w-full resize-none bg-transparent text-slate-800 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-400 border-none outline-none text-sm leading-relaxed pr-10"
            rows={2}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {/* Mic Button */}
          <button
            type="button"
            onClick={toggleVoiceInput}
            className={`absolute right-3 p-2 rounded-full transition-all duration-300 ${
              isListening
                ? "bg-red-500 animate-pulse text-white shadow-lg"
                : "bg-teal-500 hover:bg-teal-600 text-white"
            }`}
            title={isListening ? "Listening..." : "Start voice input"}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
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

      {/* Recording Indicator */}
      {isListening && (
        <div className="flex justify-center items-center gap-2 text-red-500 text-sm">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
          Listening...
        </div>
      )}
    </div>
  );
};
