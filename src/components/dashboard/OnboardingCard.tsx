"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

const steps = [
  {
    number: 1,
    title: "Add your first insight",
    description:
      "Manually enter a piece of customer feedback or upload a CSV file.",
    actionLabel: "Go to Ingest",
    actionHref: "/ingest",
  },
  {
    number: 2,
    title: "AI will classify and analyze",
    description:
      "Insights are automatically categorized, scored, and grouped into themes.",
  },
  {
    number: 3,
    title: "Get smart briefings and recommendations",
    description:
      "Receive AI-generated executive summaries with prioritized action items.",
  },
];

export function OnboardingCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome to Insight Manager</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Get started in three simple steps to turn customer feedback into
          actionable insights.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="rounded-lg border p-4 space-y-2"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                  {step.number}
                </span>
                <h3 className="text-sm font-medium">{step.title}</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                {step.description}
              </p>
              {step.actionLabel && step.actionHref && (
                <Button size="sm" asChild className="mt-2">
                  <Link href={step.actionHref}>{step.actionLabel}</Link>
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
