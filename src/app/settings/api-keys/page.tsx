"use client";

import { useEffect, useState, useCallback } from "react";
import { RiAddLine, RiFileCopyLine, RiDeleteBinLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
}

export default function ApiKeysSettingsPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [revealDialogOpen, setRevealDialogOpen] = useState(false);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/api-keys");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setKeys(data);
    } catch {
      toast.error("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  async function handleCreate() {
    if (!newKeyName.trim()) {
      toast.error("Please provide a name for the key");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      if (!res.ok) throw new Error("Failed to create");
      const data = await res.json();
      setNewKeyValue(data.key);
      setCreateDialogOpen(false);
      setRevealDialogOpen(true);
      setNewKeyName("");
      fetchKeys();
    } catch {
      toast.error("Failed to create API key");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    try {
      const res = await fetch(`/api/settings/api-keys/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to revoke");
      toast.success("API key revoked");
      fetchKeys();
    } catch {
      toast.error("Failed to revoke API key");
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(
      () => toast.success("Copied to clipboard"),
      () => toast.error("Failed to copy")
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Create and manage API keys for programmatic access to the Insight
                Manager API.
              </CardDescription>
            </div>
            <Dialog
              open={createDialogOpen}
              onOpenChange={setCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <Button size="sm">
                  <RiAddLine className="h-4 w-4 mr-1" />
                  Create key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create API Key</DialogTitle>
                  <DialogDescription>
                    Give your key a descriptive name so you can identify it
                    later.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-2 py-2">
                  <Label htmlFor="key-name">Key name</Label>
                  <Input
                    id="key-name"
                    placeholder="e.g. Production Ingest"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  />
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleCreate} disabled={creating}>
                    {creating ? "Creating..." : "Create"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-20 animate-pulse bg-muted rounded" />
          ) : keys.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No API keys yet. Create one to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last used</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {key.key_prefix}...
                    </TableCell>
                    <TableCell>
                      {new Date(key.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {key.last_used_at
                        ? new Date(key.last_used_at).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="icon-xs"
                        onClick={() => handleRevoke(key.id)}
                        title="Revoke key"
                      >
                        <RiDeleteBinLine className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Key reveal dialog - shows once after creation */}
      <Dialog open={revealDialogOpen} onOpenChange={setRevealDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              Copy your API key now. You will not be able to see it again.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={newKeyValue || ""}
              className="font-mono text-xs"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => newKeyValue && copyToClipboard(newKeyValue)}
              title="Copy to clipboard"
            >
              <RiFileCopyLine className="h-4 w-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setRevealDialogOpen(false);
                setNewKeyValue(null);
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
