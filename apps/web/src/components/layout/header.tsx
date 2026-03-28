"use client";

import Link from "next/link";
import { Plus, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-context";
import { ROUTES } from "@/lib/constants";

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
  const { user, logout } = useAuth();

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
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex items-center gap-2 cursor-pointer outline-none"
            >
              <span className="text-sm text-muted-foreground hidden sm:block">
                {user.name || user.email}
              </span>
              <Avatar size="sm">
                <AvatarFallback>{getInitials(user.name || user.email)}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom" sideOffset={8}>
              <DropdownMenuItem
                className="cursor-pointer"
                render={<Link href={ROUTES.SETTINGS} className="flex items-center gap-2" />}
              >
                <Settings className="h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="flex items-center gap-2 cursor-pointer"
                onClick={logout}
              >
                <LogOut className="h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
