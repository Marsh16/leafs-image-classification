"use client";

import { useRef, useState } from "react";

interface UploadInterfaceProps {
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const UploadInterface = ({ onUpload }: UploadInterfaceProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];

      // Check if it's an image file
      if (file.type.startsWith('image/')) {
        // Create a synthetic event to match the expected interface
        const syntheticEvent = {
          target: {
            files: files
          }
        } as React.ChangeEvent<HTMLInputElement>;

        onUpload(syntheticEvent);
      }
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`glass-subtle rounded-2xl p-8 border-2 border-dashed cursor-pointer transition-all duration-300 group ${
          isDragOver
            ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-900/20 scale-105'
            : 'border-slate-300 dark:border-slate-600 hover:border-teal-400 dark:hover:border-teal-500 hover:scale-105'
        }`}
      >
        <div className="text-center">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm ${
            isDragOver
              ? 'bg-gradient-to-br from-teal-100 to-teal-200 dark:from-teal-800 dark:to-teal-700 border border-teal-400 dark:border-teal-500 scale-110'
              : 'bg-gradient-to-br from-slate-100 to-teal-50 dark:from-slate-800 dark:to-slate-700 border border-teal-200 dark:border-teal-800 group-hover:scale-110'
          }`}>
            <div className={`w-8 h-8 border-2 rounded-lg border-dashed transition-colors duration-300 ${
              isDragOver ? 'border-teal-600' : 'border-teal-400'
            }`}></div>
          </div>
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-2">
            {isDragOver ? 'Drop Image Here' : 'Upload Image'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            {isDragOver
              ? 'Release to upload your leaf image'
              : 'Drag & drop your leaf image here or click to browse'
            }
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