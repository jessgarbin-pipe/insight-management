export default function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Opportunity Detail</h1>
      <p className="text-muted-foreground">
        Opportunity details and linked insights will appear here.
      </p>
    </div>
  );
}
