import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { Category } from "@/types";
import { categorySchema, type CategoryFormValues } from "@/lib/schemas";
import { createCategory, updateCategory } from "@/lib/db";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  DEFAULT_CATEGORY_COLOR,
} from "@/components/shared/icons";
import { cn } from "@/lib/utils";

export function CategoryForm({
  open,
  onOpenChange,
  category,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | undefined;
}) {
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      icon: "shopping-cart",
      color: DEFAULT_CATEGORY_COLOR,
      monthlyLimit: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        category
          ? {
              name: category.name,
              icon: category.icon,
              color: category.color,
              monthlyLimit:
                category.monthlyLimit != null
                  ? String(category.monthlyLimit)
                  : "",
            }
          : {
              name: "",
              icon: "shopping-cart",
              color: DEFAULT_CATEGORY_COLOR,
              monthlyLimit: "",
            },
      );
    }
  }, [open, category, form]);

  async function onSubmit(values: CategoryFormValues) {
    const limit = values.monthlyLimit ? Number(values.monthlyLimit) : undefined;
    const payload = {
      name: values.name,
      icon: values.icon,
      color: values.color,
      ...(limit != null ? { monthlyLimit: limit } : {}),
    };
    if (category) {
      await updateCategory(category.id, payload);
      toast.success("Category updated");
    } else {
      await createCategory(payload);
      toast.success("Category created");
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? "Edit category" : "New category"}</DialogTitle>
          <DialogDescription>
            Categories organize spending. Set an optional monthly limit to
            track budget health.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Groceries" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="monthlyLimit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Monthly limit{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="No limit"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon</FormLabel>
                  <FormControl>
                    <ScrollArea className="h-28 rounded-md border p-2">
                      <div className="grid grid-cols-8 gap-1">
                        {Object.entries(CATEGORY_ICONS).map(([name, Icon]) => (
                          <button
                            key={name}
                            type="button"
                            aria-label={name}
                            onClick={() => field.onChange(name)}
                            className={cn(
                              "flex size-8 items-center justify-center rounded-md hover:bg-accent",
                              field.value === name &&
                                "bg-accent ring-2 ring-ring",
                            )}
                          >
                            <Icon className="size-4" />
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORY_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          aria-label={`Color ${c}`}
                          onClick={() => field.onChange(c)}
                          className={cn(
                            "size-7 rounded-full border-2 transition-transform",
                            field.value === c
                              ? "scale-110 border-foreground"
                              : "border-transparent",
                          )}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">{category ? "Save" : "Create"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
