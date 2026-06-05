import { Card } from "@/components/ui/Card";

// Generic dashboard skeleton — sized to roughly match the lender content so
// the layout doesn't jump once delegation state resolves.
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <div className="inline-flex w-fit gap-2 rounded-md border border-border bg-bg-elevated p-1">
        <SkeletonBox className="h-7 w-20" />
        <SkeletonBox className="h-7 w-24" />
      </div>
      <Card className="p-6">
        <div className="flex flex-col gap-4">
          <SkeletonBox className="h-5 w-40" />
          <SkeletonBox className="h-4 w-2/3" />
          <div className="mt-2 flex flex-col gap-2">
            <SkeletonBox className="h-10 w-full" />
            <SkeletonBox className="h-10 w-full" />
            <SkeletonBox className="h-10 w-full" />
          </div>
        </div>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <SkeletonBox className="mb-4 h-5 w-32" />
          <div className="flex flex-col gap-2">
            <SkeletonBox className="h-9 w-full" />
            <SkeletonBox className="h-9 w-full" />
          </div>
        </Card>
        <Card className="p-6">
          <SkeletonBox className="mb-4 h-5 w-32" />
          <div className="flex flex-col gap-2">
            <SkeletonBox className="h-9 w-full" />
            <SkeletonBox className="h-9 w-full" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function SkeletonBox({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-bg-sunken ${className ?? ""}`}
      aria-hidden="true"
    />
  );
}
