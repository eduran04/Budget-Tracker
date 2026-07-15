import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { theme } = useTheme();
  const girly = theme === "girly-pink";
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center",
        girly && "border-primary/40 bg-accent/40",
      )}
    >
      <div
        className={cn(
          "relative flex size-12 items-center justify-center rounded-full bg-muted",
          girly && "bg-primary/15",
        )}
      >
        <Icon
          className={cn(
            "size-6 text-muted-foreground",
            girly && "text-primary",
          )}
        />
        {girly && (
          <Sparkles className="absolute -top-1 -right-1 size-4 text-primary" />
        )}
      </div>
      <div>
        <p className="font-medium">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">
            {girly ? `${description} Time to sparkle!` : description}
          </p>
        )}
      </div>
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
