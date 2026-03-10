"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Member {
  id: string;
  user_id: string;
  role: string;
  email: string;
  created_at: string;
}

interface Invite {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  accepted_at: string | null;
}

export default function MembersPage() {
  const { currentOrg } = useOrganization();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchMembers = useCallback(async () => {
    if (!currentOrg) return;

    const supabase = createClient();

    const { data: memberData } = await supabase
      .from("org_members")
      .select("id, user_id, role, created_at")
      .eq("org_id", currentOrg.id)
      .order("created_at", { ascending: true });

    if (memberData) {
      // Fetch user emails via auth - we need to use a different approach since
      // we can't directly query auth.users from the client
      const membersWithEmail: Member[] = memberData.map((m) => ({
        ...m,
        email: m.user_id, // Will be replaced below if possible
      }));

      // Check if current user is admin
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const currentMember = memberData.find((m) => m.user_id === user?.id);
      setIsAdmin(currentMember?.role === "admin");

      setMembers(membersWithEmail);
    }
  }, [currentOrg]);

  const fetchInvites = useCallback(async () => {
    if (!currentOrg) return;

    const res = await fetch(`/api/invites?org_id=${currentOrg.id}`);
    if (res.ok) {
      const data = await res.json();
      setInvites(data.invites || []);
    }
  }, [currentOrg]);

  useEffect(() => {
    fetchMembers();
    fetchInvites();
  }, [fetchMembers, fetchInvites]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrg || !inviteEmail.trim()) return;

    setLoading(true);

    const res = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        org_id: currentOrg.id,
        email: inviteEmail.trim(),
        role: inviteRole,
      }),
    });

    if (res.ok) {
      toast.success(`Invite sent to ${inviteEmail.trim()}`);
      setInviteEmail("");
      fetchInvites();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to send invite");
    }

    setLoading(false);
  }

  async function handleRemoveMember(memberId: string) {
    if (!currentOrg) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("org_members")
      .delete()
      .eq("id", memberId)
      .eq("org_id", currentOrg.id);

    if (error) {
      toast.error("Failed to remove member");
    } else {
      toast.success("Member removed");
      fetchMembers();
    }
  }

  if (!currentOrg) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Members</h1>
        <p className="text-muted-foreground">
          Create or join an organization to manage members.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Members</h1>
        <p className="text-sm text-muted-foreground">
          Manage members of {currentOrg.name}
        </p>
      </div>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Invite member</CardTitle>
            <CardDescription>
              Send an invite link to add someone to your workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="flex gap-3">
              <Input
                type="email"
                placeholder="email@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={loading}
                className="flex-1"
              />
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" disabled={loading}>
                {loading ? "Sending..." : "Invite"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current members</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                {isAdmin && <TableHead className="w-[100px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-mono text-xs">
                    {member.user_id.slice(0, 8)}...
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(member.created_at).toLocaleDateString()}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      {member.role !== "admin" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          Remove
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending invites</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell>{invite.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{invite.role}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(invite.expires_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {invite.accepted_at ? (
                        <Badge variant="default">Accepted</Badge>
                      ) : new Date(invite.expires_at) < new Date() ? (
                        <Badge variant="destructive">Expired</Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
