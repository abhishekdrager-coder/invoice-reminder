import { Card, CardContent } from "@/components/ui/Card";

type StatCardProps = {
  label: string;
  value: string;
  description: string;
};

export function StatCard({ label, value, description }: StatCardProps) {
  return (
    <Card>
      <CardContent className="space-y-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="text-3xl font-bold text-slate-950">{value}</p>
        <p className="text-sm text-slate-500">{description}</p>
      </CardContent>
    </Card>
  );
}
