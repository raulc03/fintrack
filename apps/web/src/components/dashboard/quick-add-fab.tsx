"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickAddFabProps {
  onClick: () => void;
}

export function QuickAddFab({ onClick }: QuickAddFabProps) {
  return (
    <Button
      onClick={onClick}
      className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 size-14 rounded-full shadow-lg opacity-40 hover:opacity-100 hover:scale-105 transition-[opacity,transform] duration-200"
      aria-label="Quick add movement"
    >
      <Plus className="size-6" />
    </Button>
  );
}
