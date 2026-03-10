"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CreateOrgPage() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Organization name is required");
      return;
    }

    setLoading(true);
    setError("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in");
      setLoading(false);
      return;
    }

    const slug = slugify(trimmedName) || `org-${Date.now()}`;

    // Create the organization
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({ name: trimmedName, slug })
      .select("id")
      .single();

    if (orgError) {
      if (orgError.message.includes("duplicate") || orgError.message.includes("unique")) {
        setError("An organization with this name already exists. Try a different name.");
      } else {
        setError("Failed to create organization. Please try again.");
      }
      setLoading(false);
      return;
    }

    // Add current user as admin
    const { error: memberError } = await supabase.from("org_members").insert({
      org_id: org.id,
      user_id: user.id,
      role: "admin",
    });

    if (memberError) {
      setError("Organization created but failed to add you as admin.");
      setLoading(false);
      return;
    }

    // Set org cookie
    document.cookie = `org_id=${org.id}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Create your workspace</CardTitle>
          <CardDescription>
            Set up your organization to start managing insights with your team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="org-name" className="text-sm font-medium">
                Organization name
              </label>
              <Input
                id="org-name"
                placeholder="Acme Inc."
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                autoFocus
              />
              {name.trim() && (
                <p className="text-xs text-muted-foreground">
                  Slug: {slugify(name.trim()) || "..."}
                </p>
              )}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Create workspace"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
