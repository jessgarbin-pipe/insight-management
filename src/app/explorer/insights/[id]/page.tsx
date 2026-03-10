export default function InsightDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Insight Detail</h1>
      <p className="text-muted-foreground">
        Full insight details, linked themes, and opportunities.
      </p>
    </div>
  );
}
