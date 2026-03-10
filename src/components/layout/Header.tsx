"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { RiSunLine, RiMoonLine, RiSettings3Line } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/layout/UserMenu";
import { WorkspaceSwitcher } from "@/components/layout/WorkspaceSwitcher";

const appNavItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Themes", href: "/explorer/themes" },
  { label: "Opportunities", href: "/explorer/opportunities" },
  { label: "Insights", href: "/explorer/insights" },
  { label: "Ask", href: "/ask" },
  { label: "Ingest", href: "/ingest" },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <Button variant="ghost" size="sm" className={cn("h-8 w-8 px-0", className)} />;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("h-8 w-8 px-0", className)}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {resolvedTheme === "dark" ? (
        <RiSunLine className="h-4 w-4" />
      ) : (
        <RiMoonLine className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isLandingPage = pathname === "/";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 md:px-6">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <span className="text-lg font-bold">Insight Manager</span>
        </Link>

        {isLandingPage ? (
          <div className="hidden md:flex items-center ml-auto gap-2">
            <ThemeToggle />
            <Button size="sm" asChild>
              <Link href="/dashboard">Get Started</Link>
            </Button>
          </div>
        ) : (
          <nav className="hidden md:flex items-center space-x-1">
            {appNavItems.map((item) => (
              <Button
                key={item.href}
                variant={isActive(pathname, item.href) ? "secondary" : "ghost"}
                size="sm"
                asChild
              >
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}
          </nav>
        )}

        <div className={cn("flex items-center gap-2", !isLandingPage && "ml-auto")}>
          {!isLandingPage && <WorkspaceSwitcher />}
          {!isLandingPage && (
            <Button variant="ghost" size="sm" className="h-8 w-8 px-0" asChild>
              <Link href="/settings">
                <RiSettings3Line className="h-4 w-4" />
                <span className="sr-only">Settings</span>
              </Link>
            </Button>
          )}
          {!isLandingPage && <ThemeToggle />}
          {!isLandingPage && <UserMenu />}
          <div className="md:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  Menu
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <SheetTitle>Navigation</SheetTitle>
                <nav className="flex flex-col space-y-1 mt-4">
                  {isLandingPage ? (
                    <Button
                      className="justify-start"
                      asChild
                      onClick={() => setMobileOpen(false)}
                    >
                      <Link href="/dashboard">Get Started</Link>
                    </Button>
                  ) : (
                    <>
                      {appNavItems.map((item) => (
                        <Button
                          key={item.href}
                          variant={
                            isActive(pathname, item.href) ? "secondary" : "ghost"
                          }
                          className={cn("justify-start")}
                          asChild
                          onClick={() => setMobileOpen(false)}
                        >
                          <Link href={item.href}>{item.label}</Link>
                        </Button>
                      ))}
                      <Button
                        variant={isActive(pathname, "/settings") ? "secondary" : "ghost"}
                        className={cn("justify-start")}
                        asChild
                        onClick={() => setMobileOpen(false)}
                      >
                        <Link href="/settings">
                          <RiSettings3Line className="h-4 w-4 mr-1" />
                          Settings
                        </Link>
                      </Button>
                    </>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
          {isLandingPage && <ThemeToggle className="md:hidden" />}
        </div>
      </div>
      <Separator />
    </header>
  );
}
