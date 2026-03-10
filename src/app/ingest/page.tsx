"use client";

import { useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { InsightForm } from "@/components/insights/InsightForm";
import { CsvUploader } from "@/components/ingest/CsvUploader";
import { ColumnMapper } from "@/components/ingest/ColumnMapper";
import { CsvPreview } from "@/components/ingest/CsvPreview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type CsvState =
  | { step: "upload" }
  | {
      step: "preview";
      file: File;
      mapping: Record<string, string>;
      preview: Record<string, string>[];
      headers: string[];
      totalRows: number;
    }
  | { step: "processing"; progress: string }
  | {
      step: "done";
      result: {
        total: number;
        success: number;
        failed: number;
        errors: { row: number; reason: string }[];
      };
    };

export default function IngestPage() {
  const [csvState, setCsvState] = useState<CsvState>({ step: "upload" });
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 10MB.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/ingest/csv/preview", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to preview CSV");
      }

      const data = await res.json();
      setCsvState({
        step: "preview",
        file,
        mapping: data.mapping,
        preview: data.preview,
        headers: Object.keys(data.preview[0] || {}),
        totalRows: data.total_rows,
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to process CSV"
      );
    } finally {
      setUploading(false);
    }
  };

  const handleConfirm = async () => {
    if (csvState.step !== "preview") return;

    setCsvState({ step: "processing", progress: "Uploading..." });
    try {
      const formData = new FormData();
      formData.append("file", csvState.file);
      formData.append("mapping", JSON.stringify(csvState.mapping));

      const res = await fetch("/api/ingest/csv/confirm", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to process CSV");
      }

      const result = await res.json();
      setCsvState({ step: "done", result });
      toast.success(
        `Processed ${result.success} of ${result.total} insights`
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to confirm CSV"
      );
      setCsvState({ step: "upload" });
    }
  };

  const handleMappingChange = (mapping: Record<string, string>) => {
    if (csvState.step === "preview") {
      setCsvState({ ...csvState, mapping });
    }
  };

  const resetCsv = () => {
    setCsvState({ step: "upload" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Ingest</h1>
        <p className="text-sm text-muted-foreground">
          Add insights manually or upload a CSV file
        </p>
      </div>

      <Tabs defaultValue="manual">
        <TabsList>
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="csv">CSV Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="mt-4">
          <InsightForm />
        </TabsContent>

        <TabsContent value="csv" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload CSV</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {csvState.step === "upload" && (
                <>
                  <CsvUploader
                    onFileSelect={handleFileSelect}
                    disabled={uploading}
                  />
                  {uploading && (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  )}
                </>
              )}

              {csvState.step === "preview" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {csvState.totalRows} rows detected in{" "}
                      {csvState.file.name}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetCsv}
                    >
                      Choose different file
                    </Button>
                  </div>

                  <ColumnMapper
                    mapping={csvState.mapping}
                    onMappingChange={handleMappingChange}
                  />

                  <CsvPreview
                    headers={csvState.headers}
                    rows={csvState.preview.slice(0, 5)}
                  />

                  <div className="flex items-center gap-3">
                    <Button onClick={handleConfirm}>
                      Confirm &amp; Process
                    </Button>
                    <Button
                      variant="outline"
                      onClick={resetCsv}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {csvState.step === "processing" && (
                <div className="py-8 text-center space-y-4">
                  <div className="space-y-2">
                    <Skeleton className="h-2 w-full" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {csvState.progress}
                  </p>
                </div>
              )}

              {csvState.step === "done" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-2xl font-bold">
                          {csvState.result.total}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Total Rows
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-2xl font-bold text-green-600">
                          {csvState.result.success}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Successful
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-2xl font-bold text-destructive">
                          {csvState.result.failed}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Failed
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {csvState.result.errors.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-medium">Errors</h3>
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {csvState.result.errors.map((err, i) => (
                          <p
                            key={i}
                            className="text-xs text-destructive"
                          >
                            Row {err.row}: {err.reason}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <Button onClick={resetCsv}>
                      Upload Another
                    </Button>
                    <Button variant="outline" asChild>
                      <a href="/explorer/insights">View Insights</a>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
