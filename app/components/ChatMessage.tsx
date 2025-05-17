"use client";

import Image from "next/image";

interface ChatMessageProps {
  message: {
    role: string;
    content: string;
  };
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const isImage = message.content.startsWith("data:image/") && message.content.includes("base64,");
  
  return (
    <div
      className={`p-3 rounded-lg font-mono text-sm max-w-[85%] whitespace-pre-line ${
        message.role === "user"
          ? "ml-auto bg-cyan-600 text-white"
          : "bg-zinc-100 dark:bg-zinc-700 text-black dark:text-white"
      }`}
    >
      {isImage ? (
        <div className="mb-6 flex justify-center">
          <Image
            src={message.content}
            alt="Uploaded Leaf"
            width={300}
            height={300}
            className="rounded-lg shadow-lg border border-zinc-300 dark:border-zinc-700"
          />
        </div>
      ) : (
        <div
          className={`${
            message.role === "user"
              ? "text-end"
              : ""
          }`}
        >
          {message.content}
        </div>
      )}
    </div>
  );
};