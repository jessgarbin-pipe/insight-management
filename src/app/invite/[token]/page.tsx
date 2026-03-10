"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface InviteInfo {
  org_name: string;
  role: string;
  email: string;
}

export default function AcceptInvitePage() {
  const params = useParams();
  const token = params.token as string;
  const router = useRouter();
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchInvite() {
      const supabase = createClient();

      const { data, error: fetchError } = await supabase
        .from("invites")
        .select("email, role, expires_at, accepted_at, org_id, organizations(name)")
        .eq("token", token)
        .single();

      if (fetchError || !data) {
        setError("This invite link is invalid or has already been used.");
        setLoading(false);
        return;
      }

      if (data.accepted_at) {
        setError("This invite has already been accepted.");
        setLoading(false);
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setError("This invite has expired. Please ask the admin for a new invite.");
        setLoading(false);
        return;
      }

      const org = data.organizations as unknown as { name: string } | null;

      setInvite({
        org_name: org?.name || "Unknown",
        role: data.role,
        email: data.email,
      });
      setLoading(false);
    }

    fetchInvite();
  }, [token]);

  async function handleAccept() {
    setAccepting(true);
    setError("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Redirect to login with return URL
      router.push(`/login?redirect=/invite/${token}`);
      return;
    }

    // Fetch the invite details
    const { data: inviteData, error: inviteError } = await supabase
      .from("invites")
      .select("id, org_id, role, accepted_at, expires_at")
      .eq("token", token)
      .single();

    if (inviteError || !inviteData) {
      setError("Invite not found.");
      setAccepting(false);
      return;
    }

    if (inviteData.accepted_at) {
      setError("This invite has already been accepted.");
      setAccepting(false);
      return;
    }

    if (new Date(inviteData.expires_at) < new Date()) {
      setError("This invite has expired.");
      setAccepting(false);
      return;
    }

    // Add user to org
    const { error: memberError } = await supabase.from("org_members").insert({
      org_id: inviteData.org_id,
      user_id: user.id,
      role: inviteData.role,
    });

    if (memberError) {
      if (memberError.message.includes("duplicate") || memberError.message.includes("unique")) {
        // Already a member
        setError("You are already a member of this organization.");
      } else {
        setError("Failed to join organization. Please try again.");
      }
      setAccepting(false);
      return;
    }

    // Mark invite as accepted
    await supabase
      .from("invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", inviteData.id);

    // Set org cookie
    document.cookie = `org_id=${inviteData.org_id}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;

    setSuccess(true);
    setAccepting(false);

    // Redirect to dashboard after a brief moment
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1500);
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Loading invite...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center space-y-4">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Join {invite?.org_name}</CardTitle>
          <CardDescription>
            You have been invited to join as a{" "}
            <span className="font-medium">{invite?.role}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          {success ? (
            <p className="text-sm text-center text-muted-foreground">
              You have joined {invite?.org_name}. Redirecting...
            </p>
          ) : (
            <Button
              className="w-full"
              onClick={handleAccept}
              disabled={accepting}
            >
              {accepting ? "Joining..." : "Accept invite"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
