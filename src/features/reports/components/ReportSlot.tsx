import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Placeholder card for a section another teammate builds in this epic.
 * ReportPage swaps it for the real section component.
 */
export function ReportSlot({ title }: { title: string }) {
  return (
    <Card className="border-dashed" data-slot-placeholder={title}>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="py-8 text-center text-sm text-muted-foreground">This section is coming soon.</p>
      </CardContent>
    </Card>
  );
}
