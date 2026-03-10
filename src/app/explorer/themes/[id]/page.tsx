export default function ThemeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Theme Detail</h1>
      <p className="text-muted-foreground">
        Theme details and linked insights will appear here.
      </p>
    </div>
  );
}
