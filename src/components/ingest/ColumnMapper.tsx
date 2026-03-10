"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const insightFields = [
  { value: "title", label: "Title" },
  { value: "description", label: "Description" },
  { value: "source", label: "Source" },
  { value: "metadata", label: "Metadata" },
  { value: "_skip", label: "Skip" },
];

export function ColumnMapper({
  mapping,
  onMappingChange,
}: {
  mapping: Record<string, string>;
  onMappingChange: (mapping: Record<string, string>) => void;
}) {
  const handleChange = (csvColumn: string, insightField: string) => {
    onMappingChange({ ...mapping, [csvColumn]: insightField });
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium">Column Mapping</h3>
      <div className="space-y-2">
        {Object.entries(mapping).map(([csvCol, field]) => (
          <div key={csvCol} className="flex items-center gap-3">
            <span className="text-xs min-w-[120px] font-medium truncate">
              {csvCol}
            </span>
            <span className="text-xs text-muted-foreground">&rarr;</span>
            <Select
              value={field}
              onValueChange={(val) => handleChange(csvCol, val)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {insightFields.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}
