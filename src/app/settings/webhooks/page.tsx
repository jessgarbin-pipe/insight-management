"use client";

import { RiFileCopyLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const BASE_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || "https://your-app.vercel.app";

const webhooks = [
  {
    name: "Intercom",
    path: "/api/webhooks/intercom",
    instructions:
      'In your Intercom Developer Hub, go to Webhooks and add the URL below. Select "conversation.user.created" and "conversation.user.replied" topics. Set your INTERCOM_WEBHOOK_SECRET environment variable to match the secret shown in Intercom.',
  },
  {
    name: "Zendesk",
    path: "/api/webhooks/zendesk",
    instructions:
      "In Zendesk Admin Center, go to Apps and integrations > Webhooks. Create a new webhook with the URL below. Then create a Trigger that fires on ticket creation/update and sends to this webhook. Set your ZENDESK_WEBHOOK_SECRET environment variable.",
  },
  {
    name: "Slack",
    path: "/api/webhooks/slack",
    instructions:
      'In your Slack App settings, go to Event Subscriptions and set the Request URL to the URL below. Subscribe to "message.channels" events. Set your SLACK_SIGNING_SECRET environment variable to the Signing Secret from your Slack app.',
  },
];

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success("Copied to clipboard"),
    () => toast.error("Failed to copy")
  );
}

export default function WebhooksSettingsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Webhook URLs</CardTitle>
          <CardDescription>
            Use these URLs to connect external services to Insight Manager.
            Incoming data from these webhooks is automatically ingested as
            insights.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {webhooks.map((webhook, i) => (
            <div key={webhook.name}>
              {i > 0 && <Separator className="mb-6" />}
              <div className="space-y-3">
                <Label className="text-sm font-medium">{webhook.name}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={`${BASE_URL}${webhook.path}`}
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      copyToClipboard(`${BASE_URL}${webhook.path}`)
                    }
                    title="Copy URL"
                  >
                    <RiFileCopyLine className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {webhook.instructions}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
