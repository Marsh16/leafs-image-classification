// app/components/Upload/UploadCard.tsx
"use client";
import { useRef, useState } from "react";
import Confetti from "react-confetti";
import useWindowSize from "@/app/hooks/useWindowSize";
import { Message, PredictionHistoryItem } from "@/app/types";
import { Card } from "../ui/Card";
import { Button } from "../ui/button";

interface UploadCardProps {
  onPrediction: (prediction: PredictionHistoryItem) => void;
  onMessage: (message: Message) => void;
}

export default function UploadCard({ onPrediction, onMessage }: UploadCardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { width, height } = useWindowSize();
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
      const base64String = (event.target?.result as string).split(",")[1];
      const imageSrc = event.target?.result as string;

      setCurrentImage(imageSrc);
      setPrediction(null);
      setConfidence(null);
      setLoading(true);

      onMessage({ role: "user", content: imageSrc });

      try {
        const response = await fetch("/api/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: base64String }),
        });

        const result = await response.json();

        if (response.ok) {
          const entry = {
            image: imageSrc,
            class: result.class,
            confidence: result.confidence,
            timestamp: new Date().toISOString(),
          };
          setPrediction(result.class);
          setConfidence(result.confidence);
          onPrediction(entry);

          onMessage({
            role: "assistant",
            content: `This leaf is likely ${result.class} with ${result.confidence}% confidence.`,
          });
        }
      } catch (error) {
        console.error("Upload error", error);
      } finally {
        setLoading(false);
      }
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="flex justify-center items-center">
      <Card className="w-full max-w-md p-4 flex items-center justify-between bg-white dark:bg-zinc-800">
        <label className="text-zinc-500 dark:text-zinc-400 font-mono cursor-pointer flex-grow">
          Upload that 🍃 pic
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
            ref={fileInputRef}
          />
        </label>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          onClick={handleClick}
        >
          <span className="text-2xl">📤</span>
        </Button>
      </Card>
      {prediction?.toLowerCase().includes("healthy") && confidence && confidence > 75 && (
        <Confetti
          width={width}
          height={height}
          numberOfPieces={250}
          recycle={false}
          colors={["#00F2B4", "#FF77FF", "#6B5B95", "#5DD6F5"]}
        />
      )}
    </div>
  );
}
