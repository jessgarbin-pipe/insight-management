import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

const features = [
  {
    title: "AI Classification",
    description:
      "Automatically classify, tag, and prioritize incoming customer feedback using AI-powered analysis.",
  },
  {
    title: "Smart Briefings",
    description:
      "Get daily AI-generated executive summaries with actionable items ranked by priority and impact.",
  },
  {
    title: "Data-Driven Decisions",
    description:
      "Surface emerging themes and opportunities from your feedback to make informed product decisions.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center">
      <section className="w-full max-w-3xl text-center py-16 md:py-24 px-4">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          Turn Customer Feedback into Action
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Insight Manager uses AI to classify, cluster, and prioritize your
          customer insights so your team can focus on what matters most.
        </p>
        <Button size="lg" asChild>
          <Link href="/dashboard">Get Started</Link>
        </Button>
      </section>

      <section className="w-full max-w-5xl px-4 pb-16 md:pb-24">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <CardTitle className="text-base">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
