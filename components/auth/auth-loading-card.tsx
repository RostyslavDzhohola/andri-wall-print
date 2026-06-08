import { Skeleton } from "@/components/ui/skeleton";

type AuthLoadingCardProps = {
  description: string;
  title: string;
};

export function AuthLoadingCard({ description, title }: AuthLoadingCardProps) {
  return (
    <section
      aria-busy="true"
      aria-live="polite"
      className="w-full max-w-[25rem] rounded-lg border bg-card p-6 shadow-[0_22px_70px_rgba(24,24,27,0.12)]"
    >
      <div className="grid gap-5">
        <div className="grid gap-2 text-center">
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="grid gap-3">
          <Skeleton className="h-10 rounded-md" />
          <Skeleton className="h-10 rounded-md" />
        </div>
        <div className="grid gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-11 rounded-md" />
        </div>
        <Skeleton className="h-11 rounded-md bg-primary/20" />
      </div>
    </section>
  );
}
