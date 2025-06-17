"use client";

import Image from "next/image";
import ReactMarkdown from "react-markdown";

interface ChatMessageProps {
  message: {
    role: string;
    content: string;
  };
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const isImage =
    message.content.startsWith("data:image/") &&
    message.content.includes("base64,");

  const isUser = message.role === "user";

  return (
    <div
      className={`p-4 rounded-xl max-w-[85%] leading-relaxed whitespace-pre-line shadow ${
        isUser
          ? "ml-auto bg-cyan-600 text-white"
          : "bg-zinc-100 dark:bg-zinc-800 text-black dark:text-zinc-100"
      }`}
    >
      {isImage ? (
        <div className="mb-4 flex justify-center">
          <Image
            src={message.content}
            alt="Uploaded Leaf"
            width={300}
            height={300}
            className="rounded-lg shadow-md border border-zinc-300 dark:border-zinc-600"
          />
        </div>
      ) : (
        <div
          className={`${
            isUser
              ? "text-right font-mono"
              : "prose prose-sm dark:prose-invert max-w-none"
          }`}
        >
          <div className="text-left text-sm leading-snug dark:text-white">
            <ReactMarkdown
              components={{
                p: ({ node, ...props }) => (
                  <p className="mb-0 mt-0">{props.children}</p>
                ),
                strong: ({ node, ...props }) => (
                  <strong className="font-semibold mb-0 mt-0">{props.children}</strong>
                ),
                li: ({ node, ...props }) => (
                  <li className="ml-4 list-disc mb-0 mt-0">{props.children}</li>
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
