"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";

interface Message {
  role: string;
  content: string;
  timestamp?: number;
}

interface ChatMessageProps {
  message: Message;
}

interface ChatInterfaceProps {
  diseaseName: string;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const isImage =
    message.content.startsWith("data:image/") &&
    message.content.includes("base64,");

  const isUser = message.role === "user";

  return (
    <div
      className={`max-w-[85%] leading-relaxed ${
        isUser ? "ml-auto" : "mr-auto"
      }`}
    >
      {isImage ? (
        <div className="glass-subtle rounded-2xl p-4 bento-item">
          <div className="flex justify-center">
            <Image
              src={message.content}
              alt="Uploaded Leaf"
              width={300}
              height={300}
              className="rounded-xl shadow-lg object-cover"
            />
          </div>
        </div>
      ) : (
        <div
          className={`glass-subtle rounded-2xl p-4 bento-item ${
            isUser
              ? "bg-gradient-to-br from-teal-50/50 to-slate-50/50 dark:from-teal-900/20 dark:to-slate-800/20 border-teal-200 dark:border-teal-800"
              : "border-slate-200 dark:border-slate-700"
          }`}
        >
          <div className={`text-sm leading-relaxed ${
            isUser
              ? "text-slate-800 dark:text-slate-200 font-medium"
              : "text-slate-700 dark:text-slate-300"
          }`}>
            <ReactMarkdown
              components={{
                p: ({ node, ...props }) => (
                  <p className="mb-2 last:mb-0">{props.children}</p>
                ),
                strong: ({ node, ...props }) => (
                  <strong className="font-bold text-teal-600 dark:text-teal-400">
                    {props.children}
                  </strong>
                ),
                em: ({ node, ...props }) => (
                  <em className="italic text-slate-600 dark:text-slate-400">
                    {props.children}
                  </em>
                ),
                ul: ({ node, ...props }) => (
                  <ul className="list-disc list-inside space-y-1 mt-2 ml-4">
                    {props.children}
                  </ul>
                ),
                li: ({ node, ...props }) => (
                  <li className="text-sm">{props.children}</li>
                ),
                code: ({ node, ...props }) => (
                  <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs font-mono">
                    {props.children}
                  </code>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};

// Main chat interface component
export const ChatInterface = ({ diseaseName }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load session from localStorage on mount
  useEffect(() => {
    const savedSessionId = localStorage.getItem("plant_doctor_session_id");
    const savedMessages = localStorage.getItem("plant_doctor_messages");

    if (savedSessionId && savedMessages) {
      setSessionId(savedSessionId);
      setMessages(JSON.parse(savedMessages));
    }
  }, []);

  // Save session to localStorage when messages or sessionId changes
  useEffect(() => {
    if (sessionId && messages.length > 0) {
      localStorage.setItem("plant_doctor_session_id", sessionId);
      localStorage.setItem("plant_doctor_messages", JSON.stringify(messages));
    }
  }, [sessionId, messages]);

  const sendMessage = async (question: string) => {
    if (!question.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: question.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          disease_name: diseaseName,
          questions: question.trim(),
          session_id: sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      // Get session ID from response header
      const newSessionId = response.headers.get("X-Session-ID");
      if (newSessionId && !sessionId) {
        setSessionId(newSessionId);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      let assistantMessage = "";

      // Add empty assistant message to show loading
      const assistantMessageIndex = messages.length + 1;
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: "",
          timestamp: Date.now(),
        },
      ]);

      // Read the stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        assistantMessage += chunk;

        // Update the assistant message
        setMessages(prev =>
          prev.map((msg, index) =>
            index === assistantMessageIndex
              ? { ...msg, content: assistantMessage }
              : msg
          )
        );
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, there was an error processing your request. Please try again.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearSession = () => {
    localStorage.removeItem("plant_doctor_session_id");
    localStorage.removeItem("plant_doctor_messages");
    setSessionId(null);
    setMessages([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white dark:bg-slate-900 rounded-xl shadow-lg">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            Plant Doctor Chat
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Disease: {diseaseName}
          </p>
        </div>
        <button
          onClick={clearSession}
          className="px-3 py-1 text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
        >
          New Session
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 dark:text-slate-400 mt-8">
            <p>Ask me anything about your mango plant care!</p>
            <p className="text-sm mt-2">I remember our conversation, so feel free to follow up on previous topics.</p>
          </div>
        )}
        
        {messages.map((message, index) => (
          <ChatMessage key={index} message={message} />
        ))}
        
        {isLoading && (
          <div className="max-w-[85%] mr-auto">
            <div className="glass-subtle rounded-2xl p-4 bento-item border-slate-200 dark:border-slate-700">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <span className="text-slate-500 dark:text-slate-400 text-sm ml-2">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex space-x-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about plant care..."
            className="flex-1 p-3 border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={() => sendMessage(inputValue)}
            disabled={isLoading || !inputValue.trim()}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-slate-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};