"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RiUserLine, RiKey2Line, RiWebhookLine, RiHistoryLine } from "@remixicon/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const settingsNav = [
  { label: "Profile", href: "/settings", icon: RiUserLine },
  { label: "API Keys", href: "/settings/api-keys", icon: RiKey2Line },
  { label: "Webhooks", href: "/settings/webhooks", icon: RiWebhookLine },
  { label: "Audit Log", href: "/settings/audit-log", icon: RiHistoryLine },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold">Settings</h1>
        <p className="text-xs text-muted-foreground">
          Manage your account, API keys, and integrations.
        </p>
      </div>
      <Separator />
      <div className="flex flex-col gap-6 md:flex-row">
        <nav className="flex flex-row gap-1 md:flex-col md:w-48 md:shrink-0">
          {settingsNav.map((item) => {
            const isActive =
              item.href === "/settings"
                ? pathname === "/settings"
                : pathname.startsWith(item.href);
            return (
              <Button
                key={item.href}
                variant={isActive ? "secondary" : "ghost"}
                size="sm"
                className={cn("justify-start gap-2")}
                asChild
              >
                <Link href={item.href}>
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </nav>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
