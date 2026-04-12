"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ellipsis, Target, Tag, Wallet, LayoutDashboard, ArrowLeftRight, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PRIMARY_NAV_ITEMS = [
  { href: ROUTES.HOME, label: "Dashboard", icon: LayoutDashboard },
  { href: ROUTES.BUCKETS, label: "Buckets", icon: PieChart },
  { href: ROUTES.MOVEMENTS, label: "Movements", icon: ArrowLeftRight },
  { href: ROUTES.GOALS, label: "Goals", icon: Target },
];

const SECONDARY_NAV_ITEMS = [
  { href: ROUTES.ACCOUNTS, label: "Accounts", icon: Wallet },
  { href: ROUTES.CATEGORIES, label: "Categories", icon: Tag },
];

export function MobileNav() {
  const pathname = usePathname();
  const isMoreActive = SECONDARY_NAV_ITEMS.some((item) => pathname.startsWith(item.href));

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto grid h-[4.5rem] max-w-md grid-cols-5 px-2 pb-[max(env(safe-area-inset-bottom),0.35rem)] pt-2">
        {PRIMARY_NAV_ITEMS.map((item) => {
          const isActive =
            item.href === ROUTES.HOME
              ? pathname === ROUTES.HOME
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}

        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] outline-none transition-colors",
              isMoreActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Ellipsis className="h-[18px] w-[18px]" />
            <span className="truncate">More</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" sideOffset={10} className="min-w-44">
            {SECONDARY_NAV_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.href);

              return (
                <DropdownMenuItem
                  key={item.href}
                  className={cn("cursor-pointer", isActive && "bg-muted text-foreground")}
                  render={<Link href={item.href} className="flex items-center gap-2" />}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
