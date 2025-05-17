// app/types/index.ts
export interface Message {
    role: "user" | "assistant";
    content: string;
  }
  
  export interface PredictionHistoryItem {
    image: string;
    class: string;
    confidence: number;
    timestamp: string;
  }
  