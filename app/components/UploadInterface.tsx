"use client";

import { useRef } from "react";

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
        className="glass-subtle rounded-2xl p-8 border-2 border-dashed border-slate-300 dark:border-slate-600 cursor-pointer transition-all duration-300 hover:border-teal-400 dark:hover:border-teal-500 hover:scale-105 group"
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-slate-100 to-teal-50 dark:from-slate-800 dark:to-slate-700 border border-teal-200 dark:border-teal-800 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm">
            <div className="w-8 h-8 border-2 border-teal-400 rounded-lg border-dashed"></div>
          </div>
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-2">
            Upload Image
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Drop your leaf image here or click to browse
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
            <span>JPG, PNG, WEBP</span>
            <span>•</span>
            <span>Max 10MB</span>
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