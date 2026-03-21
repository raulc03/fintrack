"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";

interface HeaderProps {
  title: string;
  onAddClick?: () => void;
  addLabel?: string;
  customAction?: React.ReactNode;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Header({ title, onAddClick, addLabel, customAction }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="flex items-center justify-between h-14 px-4 md:px-6 border-b border-border">
      <h1 className="text-lg font-semibold">{title}</h1>
      <div className="flex items-center gap-3">
        {customAction ?? (onAddClick && (
          <Button size="sm" onClick={onAddClick}>
            <Plus className="h-4 w-4 mr-1" />
            {addLabel ?? "Add"}
          </Button>
        ))}
        {user && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user.name || user.email}
            </span>
            <Avatar size="sm">
              <AvatarFallback>{getInitials(user.name || user.email)}</AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>
    </header>
  );
}
