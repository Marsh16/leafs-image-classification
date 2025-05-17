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
    <Card className="w-full max-w-md p-4 flex items-center justify-between bg-white dark:bg-zinc-800">
      <label className="text-zinc-500 dark:text-zinc-400 font-mono cursor-pointer flex-grow">
        Upload that 🍃 pic
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onUpload}
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
  );
};