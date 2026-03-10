"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { Theme } from "@/lib/types";

interface InsightFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  themeId: string;
  onThemeChange: (value: string) => void;
  source: string;
  onSourceChange: (value: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  themes: Theme[];
  sources: string[];
  onReset: () => void;
}

export function InsightFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  themeId,
  onThemeChange,
  source,
  onSourceChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  themes,
  sources,
  onReset,
}: InsightFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:items-center gap-3">
        <Input
          placeholder="Search insights..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="sm:col-span-2 md:max-w-xs"
        />

        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="w-full md:w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="related">Related</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        <Select value={themeId} onValueChange={onThemeChange}>
          <SelectTrigger className="w-full md:w-[160px]">
            <SelectValue placeholder="Theme" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Themes</SelectItem>
            {themes.map((theme) => (
              <SelectItem key={theme.id} value={theme.id}>
                {theme.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={source} onValueChange={onSourceChange}>
          <SelectTrigger className="w-full md:w-[130px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {sources.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:flex sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground shrink-0">From:</span>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="w-full sm:w-[150px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground shrink-0">To:</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="w-full sm:w-[150px]"
          />
        </div>
        <Button variant="ghost" size="sm" onClick={onReset}>
          Reset filters
        </Button>
      </div>
    </div>
  );
}
