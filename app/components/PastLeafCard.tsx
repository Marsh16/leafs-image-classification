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

export const PastLeafCard = ({ item, index }: PastLeafCardProps) => (
  <Card className="p-3 bg-zinc-100 dark:bg-zinc-800 shadow-md hover:shadow-xl transition duration-300">
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
          {item.confidence}% •{" "}
          {new Date(item.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  </Card>
);