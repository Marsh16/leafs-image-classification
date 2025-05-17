export interface Message {
    role: string;
    content: string;
  }
  
  export interface LeafHistoryItem {
    image: string;
    class: string;
    confidence: number;
    timestamp: string;
  }
  
  export interface PredictionResult {
    class: string;
    confidence: number;
  }