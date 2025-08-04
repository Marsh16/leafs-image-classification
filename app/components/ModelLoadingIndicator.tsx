"use client";

import { useEffect, useState } from "react";
import { Card } from "./ui/Card";

interface ModelLoadingIndicatorProps {
  message: string;
  isModelReloading?: boolean;
}

export const ModelLoadingIndicator = ({ 
  message, 
  isModelReloading = false 
}: ModelLoadingIndicatorProps) => {
  const [dots, setDots] = useState("");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === "...") return "";
        return prev + ".";
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isModelReloading) {
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return 90; // Don't go to 100% until actually complete
          return prev + Math.random() * 3;
        });
      }, 1000);

      return () => clearInterval(progressInterval);
    }
  }, [isModelReloading]);

  return (
    <Card className="w-full max-w-md p-6 bg-white dark:bg-zinc-800 border-2 border-cyan-200 dark:border-cyan-800">
      <div className="flex flex-col items-center space-y-4">
        {/* Loading animation */}
        <div className="relative">
          <div className="w-12 h-12 border-4 border-cyan-200 dark:border-cyan-800 rounded-full animate-spin border-t-cyan-600 dark:border-t-cyan-400"></div>
          {isModelReloading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-cyan-600 dark:bg-cyan-400 rounded-full animate-pulse"></div>
            </div>
          )}
        </div>

        {/* Status message */}
        <div className="text-center">
          <p className="text-sm font-mono text-zinc-600 dark:text-zinc-300 mb-2">
            {message}{dots}
          </p>
          
          {isModelReloading && (
            <>
              <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2 mb-2">
                <div 
                  className="bg-cyan-600 dark:bg-cyan-400 h-2 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                🚀 Model is starting up from cloud deployment
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                This is normal and may take 30-60 seconds
              </p>
            </>
          )}
        </div>

        {/* Helpful tip */}
        {isModelReloading && (
          <div className="bg-cyan-50 dark:bg-cyan-950 p-3 rounded-lg border border-cyan-200 dark:border-cyan-800">
            <p className="text-xs text-cyan-700 dark:text-cyan-300 text-center">
              💡 <strong>Why is this happening?</strong><br />
              Our AI model runs on cloud infrastructure and needs to "warm up" 
              when it hasn't been used recently. This ensures optimal performance!
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};
