import type { Category } from "@/types";
import { Badge } from "@/components/ui/badge";
import { getCategoryIcon } from "./icons";

export function CategoryBadge({ category }: { category?: Category | null }) {
  if (!category) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Transfer
      </Badge>
    );
  }
  const Icon = getCategoryIcon(category.icon);
  return (
    <Badge
      variant="outline"
      className="gap-1"
      style={{ borderColor: `${category.color}55`, color: category.color }}
    >
      <Icon className="size-3" />
      {category.name}
    </Badge>
  );
}
