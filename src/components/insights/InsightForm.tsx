"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface MetadataRow {
  key: string;
  value: string;
}

export function InsightForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState("");
  const [metadata, setMetadata] = useState<MetadataRow[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const addMetadataRow = () => {
    setMetadata([...metadata, { key: "", value: "" }]);
  };

  const removeMetadataRow = (index: number) => {
    setMetadata(metadata.filter((_, i) => i !== index));
  };

  const updateMetadata = (
    index: number,
    field: "key" | "value",
    val: string
  ) => {
    const updated = [...metadata];
    updated[index] = { ...updated[index], [field]: val };
    setMetadata(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      toast.error("Title and description are required");
      return;
    }

    setSubmitting(true);
    try {
      const metaObj: Record<string, string> = {};
      for (const row of metadata) {
        if (row.key.trim()) {
          metaObj[row.key.trim()] = row.value;
        }
      }

      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          source: source.trim() || "manual",
          metadata: metaObj,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create insight");
      }

      const created = await res.json();
      toast.success("Insight created", {
        description: created.title,
        action: {
          label: "View",
          onClick: () => {
            window.location.href = `/explorer/insights/${created.id}`;
          },
        },
      });

      setTitle("");
      setDescription("");
      setSource("");
      setMetadata([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create insight");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Insight</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium">
              Title <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="Short summary of the insight"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium">
              Description <span className="text-destructive">*</span>
            </label>
            <textarea
              placeholder="Full details of the insight..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="flex w-full rounded-none border border-input bg-transparent px-2.5 py-2 text-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium">Source</label>
            <Input
              placeholder='e.g. "intercom", "zendesk" (defaults to "manual")'
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium">Metadata</label>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={addMetadataRow}
              >
                + Add field
              </Button>
            </div>
            {metadata.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  placeholder="Key"
                  value={row.key}
                  onChange={(e) => updateMetadata(i, "key", e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Value"
                  value={row.value}
                  onChange={(e) => updateMetadata(i, "value", e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => removeMetadataRow(i)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>

          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Create Insight"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
