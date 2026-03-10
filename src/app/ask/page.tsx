"use client";

import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "@/components/ask/ChatMessage";
import { ChatInput } from "@/components/ask/ChatInput";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Insight } from "@/lib/types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  referencedInsights?: Insight[];
}

export default function AskPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async (question: string) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: question,
    };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      if (!res.ok) throw new Error("Failed to get answer");

      const data = await res.json();
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.answer,
        referencedInsights: data.referenced_insights,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content:
          "Sorry, I was unable to process your question. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-1">Ask the System</h1>
        <p className="text-sm text-muted-foreground">
          Ask natural language questions about your insights
        </p>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 pb-4"
      >
        {messages.length === 0 && !loading && (
          <Card className="mt-12">
            <CardContent className="py-12 text-center">
              <p className="text-sm font-medium mb-2">
                What would you like to know?
              </p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Ask questions like &ldquo;What are customers saying about
                pricing?&rdquo; or &ldquo;What themes emerged this
                week?&rdquo;
              </p>
            </CardContent>
          </Card>
        )}

        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            role={msg.role}
            content={msg.content}
            referencedInsights={msg.referencedInsights}
          />
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] space-y-2">
              <Card className="bg-muted">
                <CardContent className="pt-3 pb-3">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      <div className="border-t pt-4">
        <ChatInput onSend={handleSend} disabled={loading} />
      </div>
    </div>
  );
}
