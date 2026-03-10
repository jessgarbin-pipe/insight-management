"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { Insight } from "@/lib/types";

interface InsightTableProps {
  insights: Insight[];
  onBulkStatusChange?: (ids: string[], status: string) => void;
}

function InsightMobileCard({ insight }: { insight: Insight }) {
  return (
    <Card>
      <CardContent className="pt-4 space-y-2">
        <Link
          href={`/explorer/insights/${insight.id}`}
          className="font-medium hover:underline text-sm line-clamp-2"
        >
          {insight.title}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge value={insight.status} />
          {insight.sentiment && <StatusBadge value={insight.sentiment} />}
          {insight.type && <StatusBadge value={insight.type} />}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{insight.source}</span>
          <div className="flex items-center gap-2">
            {insight.priority_score !== null && (
              <span>
                Priority: {insight.priority_score.toFixed(0)}
                {(insight.metadata as Record<string, unknown>)?.manually_scored === true && " (RICE)"}
              </span>
            )}
            <span>{new Date(insight.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function InsightTable({
  insights,
  onBulkStatusChange,
}: InsightTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === insights.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(insights.map((i) => i.id)));
    }
  };

  const handleBulkStatus = (status: string) => {
    if (onBulkStatusChange) {
      onBulkStatusChange(Array.from(selectedIds), status);
      setSelectedIds(new Set());
    }
  };

  return (
    <div className="space-y-2">
      {selectedIds.size > 0 && onBulkStatusChange && (
        <div className="flex items-center gap-3 py-2">
          <span className="text-xs text-muted-foreground">
            {selectedIds.size} selected
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Change Status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleBulkStatus("open")}>
                Open
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkStatus("related")}>
                Related
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkStatus("closed")}>
                Closed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkStatus("archived")}>
                Archived
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {insights.map((insight) => (
          <InsightMobileCard key={insight.id} insight={insight} />
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <input
                  type="checkbox"
                  checked={
                    insights.length > 0 && selectedIds.size === insights.length
                  }
                  onChange={toggleAll}
                  className="rounded border-input"
                />
              </TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Sentiment</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {insights.map((insight) => (
              <TableRow key={insight.id} data-state={selectedIds.has(insight.id) ? "selected" : undefined}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(insight.id)}
                    onChange={() => toggleSelect(insight.id)}
                    className="rounded border-input"
                  />
                </TableCell>
                <TableCell>
                  <Link
                    href={`/explorer/insights/${insight.id}`}
                    className="font-medium hover:underline line-clamp-1"
                  >
                    {insight.title}
                  </Link>
                </TableCell>
                <TableCell>{insight.source}</TableCell>
                <TableCell>
                  <StatusBadge value={insight.status} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span>
                      {insight.priority_score !== null
                        ? insight.priority_score.toFixed(0)
                        : "-"}
                    </span>
                    {(insight.metadata as Record<string, unknown>)?.manually_scored === true && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        RICE
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {insight.sentiment ? (
                    <StatusBadge value={insight.sentiment} />
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>
                  {insight.type ? (
                    <StatusBadge value={insight.type} />
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>
                  {new Date(insight.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
