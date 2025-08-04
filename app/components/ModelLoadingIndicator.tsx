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
    <div className="glass-strong rounded-3xl p-8 max-w-md mx-auto bento-item">
      <div className="flex flex-col items-center space-y-6">
        {/* Loading animation */}
        <div className="relative">
          <div className="w-16 h-16 border-4 border-slate-200 dark:border-slate-700 rounded-full animate-spin border-t-teal-500 dark:border-t-teal-400"></div>
          {isModelReloading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-500 rounded-full animate-pulse shadow-sm"></div>
            </div>
          )}
        </div>

        {/* Status message */}
        <div className="text-center">
          <p className="text-base font-medium text-slate-700 dark:text-slate-300 mb-3">
            {message}{dots}
          </p>

          {isModelReloading && (
            <>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 mb-4 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-teal-400 to-teal-500 h-3 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
                  Model is starting up from cloud deployment
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500">
                  This is normal and may take 30-60 seconds
                </p>
              </div>
            </>
          )}
        </div>

        {/* Helpful tip */}
        {isModelReloading && (
          <div className="glass-subtle rounded-2xl p-4 border border-teal-200 dark:border-teal-800">
            <div className="text-center">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                <strong className="text-teal-600 dark:text-teal-400">AI Model Initialization</strong><br />
                Neural network is booting up from cloud infrastructure.
                This ensures peak performance for your analysis.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
