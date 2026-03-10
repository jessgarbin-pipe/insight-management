"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/shared/Pagination";
import type { AuditLogEntry, PaginatedResponse } from "@/lib/types";

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  update: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  delete: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const TABLE_OPTIONS = [
  "insights",
  "opportunities",
  "manager_actions",
  "themes",
];

const ACTION_OPTIONS = ["create", "update", "delete"];

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

function DiffView({
  oldData,
  newData,
}: {
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
}) {
  if (!oldData && !newData) return <span className="text-muted-foreground text-xs">No data</span>;

  const allKeys = new Set([
    ...Object.keys(oldData || {}),
    ...Object.keys(newData || {}),
  ]);

  // Only show keys that changed
  const changedKeys = Array.from(allKeys).filter((key) => {
    const oldVal = oldData?.[key];
    const newVal = newData?.[key];
    return JSON.stringify(oldVal) !== JSON.stringify(newVal);
  });

  if (changedKeys.length === 0 && oldData && newData) {
    return <span className="text-muted-foreground text-xs">No changes detected</span>;
  }

  return (
    <div className="space-y-1 text-xs font-mono">
      {changedKeys.map((key) => {
        const oldVal = oldData?.[key];
        const newVal = newData?.[key];
        return (
          <div key={key} className="flex flex-col gap-0.5">
            <span className="font-semibold text-foreground">{key}:</span>
            {oldVal !== undefined && (
              <span className="text-red-600 dark:text-red-400 pl-2">
                - {JSON.stringify(oldVal)}
              </span>
            )}
            {newVal !== undefined && (
              <span className="text-green-600 dark:text-green-400 pl-2">
                + {JSON.stringify(newVal)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [pagination, setPagination] = useState({ page: 1, per_page: 25, total: 0, total_pages: 0 });
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Filters
  const [tableName, setTableName] = useState<string>("");
  const [action, setAction] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const fetchEntries = useCallback(async (page: number) => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("per_page", "25");
    if (tableName) params.set("table_name", tableName);
    if (action) params.set("action", action);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);

    try {
      const res = await fetch(`/api/audit-log?${params.toString()}`);
      if (res.ok) {
        const json: PaginatedResponse<AuditLogEntry> = await res.json();
        setEntries(json.data);
        setPagination(json.pagination);
      }
    } catch (err) {
      console.error("Failed to fetch audit log:", err);
    } finally {
      setLoading(false);
    }
  }, [tableName, action, dateFrom, dateTo]);

  useEffect(() => {
    fetchEntries(1);
  }, [fetchEntries]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">
          Track all data changes across the platform.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Select value={tableName} onValueChange={(v) => setTableName(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All tables" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tables</SelectItem>
                {TABLE_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={action} onValueChange={(v) => setAction(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {ACTION_OPTIONS.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              placeholder="From date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[160px]"
            />

            <Input
              type="date"
              placeholder="To date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[160px]"
            />

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTableName("");
                setAction("");
                setDateFrom("");
                setDateTo("");
              }}
            >
              Clear filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Timeline table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Timestamp</TableHead>
                <TableHead className="w-[100px]">Action</TableHead>
                <TableHead className="w-[150px]">Table</TableHead>
                <TableHead>Record ID</TableHead>
                <TableHead className="w-[80px]">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No audit log entries found.
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => (
                  <>
                    <TableRow
                      key={entry.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() =>
                        setExpandedRow(expandedRow === entry.id ? null : entry.id)
                      }
                    >
                      <TableCell className="text-xs text-muted-foreground">
                        {formatTimestamp(entry.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={ACTION_COLORS[entry.action] || ""}
                        >
                          {entry.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {entry.table_name}
                      </TableCell>
                      <TableCell className="font-mono text-xs truncate max-w-[200px]">
                        {entry.record_id || "-"}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="text-xs">
                          {expandedRow === entry.id ? "Hide" : "Show"}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedRow === entry.id && (
                      <TableRow key={`${entry.id}-diff`}>
                        <TableCell colSpan={5} className="bg-muted/30 p-4">
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                              <p className="text-xs font-semibold mb-1 text-muted-foreground">
                                User ID
                              </p>
                              <p className="text-xs font-mono">
                                {entry.user_id || "system"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold mb-1 text-muted-foreground">
                                IP Address
                              </p>
                              <p className="text-xs font-mono">
                                {entry.ip_address || "unknown"}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3">
                            <p className="text-xs font-semibold mb-1 text-muted-foreground">
                              Changes
                            </p>
                            <DiffView
                              oldData={entry.old_data}
                              newData={entry.new_data}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {pagination.total_pages > 1 && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.total_pages}
          onPageChange={(p) => fetchEntries(p)}
        />
      )}
    </div>
  );
}
