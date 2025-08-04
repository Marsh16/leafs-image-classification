"use client";

import Image from "next/image";
import { Card } from "./ui/Card";

interface LeafHistoryItem {
  image: string;
  class: string;
  confidence: number;
  timestamp: string;
}

interface PastLeafCardProps {
  item: LeafHistoryItem;
  index: number;
}

export const PastLeafCard = ({ item, index }: PastLeafCardProps) => {
  const isHealthy = item.class === 'Healthy';

  return (
    <div className="glass-subtle rounded-xl p-3 hover:scale-105 transition-all duration-300 group cursor-pointer">
      <div className="flex gap-3 items-center">
        <div className="relative">
          <Image
            src={item.image}
            alt={`Leaf ${index}`}
            width={48}
            height={48}
            className="rounded-lg object-cover"
          />
          <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${
            isHealthy
              ? 'bg-emerald-400'
              : 'bg-orange-400'
          } flex items-center justify-center text-xs`}>
            {isHealthy ? '✓' : '⚠'}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold truncate ${
            isHealthy
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-orange-600 dark:text-orange-400'
          }`}>
            {item.class}
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">{item.confidence}%</span>
            <span>•</span>
            <span>{new Date(item.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}</span>
          </div>
        </div>
      </div>
    </div>
  );
};