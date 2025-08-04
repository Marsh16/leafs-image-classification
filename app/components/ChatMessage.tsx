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
              ? "bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 border-emerald-200 dark:border-emerald-800"
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
                  <strong className="font-bold text-emerald-600 dark:text-emerald-400">
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
