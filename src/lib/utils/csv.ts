import Papa from "papaparse";

const INSIGHT_FIELDS = ["title", "description", "source"] as const;

const FIELD_SYNONYMS: Record<string, string> = {
  // title
  title: "title",
  name: "title",
  subject: "title",
  heading: "title",
  summary: "title",
  // description
  description: "description",
  details: "description",
  detail: "description",
  feedback: "description",
  comment: "description",
  comments: "description",
  text: "description",
  body: "description",
  content: "description",
  message: "description",
  note: "description",
  notes: "description",
  // source
  source: "source",
  origin: "source",
  channel: "source",
  platform: "source",
};

export function parseCSV(
  text: string
): { headers: string[]; rows: Record<string, string>[]; totalRows: number } {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  const headers = result.meta.fields || [];
  return {
    headers,
    rows: result.data,
    totalRows: result.data.length,
  };
}

export function autoMapColumns(
  headers: string[]
): Record<string, string> {
  const mapping: Record<string, string> = {};
  const usedFields = new Set<string>();

  for (const header of headers) {
    const normalized = header.toLowerCase().trim().replace(/[_\-\s]+/g, "");
    // Check synonyms
    for (const [synonym, field] of Object.entries(FIELD_SYNONYMS)) {
      const normalizedSynonym = synonym.replace(/[_\-\s]+/g, "");
      if (normalized === normalizedSynonym && !usedFields.has(field)) {
        mapping[header] = field;
        usedFields.add(field);
        break;
      }
    }
    if (!mapping[header]) {
      mapping[header] = "metadata";
    }
  }

  return mapping;
}

export function applyMapping(
  row: Record<string, string>,
  mapping: Record<string, string>
): {
  title: string | undefined;
  description: string | undefined;
  source: string;
  metadata: Record<string, unknown>;
} {
  let title: string | undefined;
  let description: string | undefined;
  let source = "csv";
  const metadata: Record<string, unknown> = {};

  for (const [csvColumn, insightField] of Object.entries(mapping)) {
    const value = row[csvColumn];
    if (value === undefined || value === null) continue;

    switch (insightField) {
      case "title":
        title = value;
        break;
      case "description":
        description = value;
        break;
      case "source":
        source = value || "csv";
        break;
      default:
        metadata[csvColumn] = value;
        break;
    }
  }

  return { title, description, source, metadata };
}
