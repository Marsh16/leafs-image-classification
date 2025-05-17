// app/components/Sidebar/HistorySidebar.tsx
"use client";
import Image from "next/image";
import { Clock } from "lucide-react";
import { PredictionHistoryItem } from "@/app/types";
import { Card } from "../ui/Card";

interface HistorySidebarProps {
  history: PredictionHistoryItem[];
  currentDateTime: string;
}

export default function HistorySidebar({ history, currentDateTime }: HistorySidebarProps) {
  return (
    <aside className="w-full md:w-1/4 bg-white dark:bg-zinc-900 p-4 overflow-y-auto border-r border-zinc-300 dark:border-zinc-700">
      <h2 className="text-lg font-bold mb-4 text-center text-black dark:text-white">
        🔮 Past Leafs
      </h2>
      <div className="space-y-4">
        {history.map((item, index) => (
          <Card
            key={index}
            className="p-3 bg-zinc-100 dark:bg-zinc-800 shadow-md hover:shadow-xl transition duration-300"
          >
            <div className="flex gap-2 items-center">
              <Image
                src={item.image}
                alt={`Leaf ${index}`}
                width={60}
                height={45}
                className="rounded-lg"
              />
              <div>
                <p className="text-sm font-mono text-blue-600 dark:text-blue-400">
                  <strong>{item.class}</strong>
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  {item.confidence}% • {new Date(item.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <div className="fixed bottom-5 left-5 z-50">
        <div className="bg-white dark:bg-zinc-800 rounded-full px-4 py-2 shadow-md flex items-center">
          <Clock className="w-4 h-4 mr-2 text-zinc-500 dark:text-zinc-400" />
          <span className="text-sm text-zinc-700 dark:text-zinc-300">
            {currentDateTime}
          </span>
        </div>
      </div>
    </aside>
  );
}