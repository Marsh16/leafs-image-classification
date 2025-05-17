// app/components/Chat/ChatWindow.tsx
"use client";
import Image from "next/image";
import { Message } from "@/app/types";

interface ChatWindowProps {
  messages: Message[];
}

export default function ChatWindow({ messages }: ChatWindowProps) {
  return (
    <div className="w-full max-w-3xl py-6 space-y-3 mx-auto">
      {messages.map((msg, idx) => (
        <div
          key={idx}
          className={`p-3 rounded-lg font-mono text-sm max-w-[85%] whitespace-pre-line ${
            msg.role === "user"
              ? "ml-auto bg-cyan-600 text-white text-end"
              : "bg-zinc-100 dark:bg-zinc-700 text-black dark:text-white"
          }`}
        >
          {msg.content.startsWith("data:image/") && msg.content.includes("base64,") ? (
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
            msg.content
          )}
        </div>
      ))}
    </div>
  );
}