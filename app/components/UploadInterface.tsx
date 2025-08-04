"use client";

import { useRef } from "react";
import { Card } from "./ui/Card";
import { Button } from "./ui/button";

interface UploadInterfaceProps {
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const UploadInterface = ({ onUpload }: UploadInterfaceProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <div
        onClick={handleClick}
        className="glass-subtle rounded-2xl p-8 border-2 border-dashed border-slate-300 dark:border-slate-600 cursor-pointer transition-all duration-300 hover:border-emerald-400 dark:hover:border-emerald-500 hover:scale-105 group"
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300">
            📤
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">
            Upload Leaf Image
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Drop your mango leaf photo here or click to browse
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-500">
            <span>📸 JPG, PNG, WEBP</span>
            <span>•</span>
            <span>📏 Max 10MB</span>
          </div>
        </div>

        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onUpload}
          ref={fileInputRef}
        />
      </div>
    </div>
  );
};