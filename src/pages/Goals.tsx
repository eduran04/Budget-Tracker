import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  addMonths,
  differenceInCalendarMonths,
  format,
} from "date-fns";
import {
  MoreVertical,
  PartyPopper,
  Pencil,
  PiggyBank,
  Plus,
  Target,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { Goal } from "@/types";
import { useAccounts, useGoals } from "@/hooks/use-live-data";
import {
  contributeToGoal,
  createGoal,
  deleteGoal,
  updateGoal,
} from "@/lib/db";
import { goalSchema, type GoalFormValues } from "@/lib/schemas";
import { formatDisplayDate, parseISODate } from "@/lib/dates";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

const NONE = "__none__";

/** Months of saving so far, minimum 1 so brand-new goals don't divide by zero. */
function monthsActive(goal: Goal): number {
  return Math.max(
    differenceInCalendarMonths(new Date(), parseISODate(goal.createdAt)) + 1,
    1,
  );
}

function projectedCompletion(goal: Goal): string | null {
  if (goal.currentAmount >= goal.targetAmount) return null;
  if (goal.currentAmount <= 0) return null;
  const rate = goal.currentAmount / monthsActive(goal);
  const monthsLeft = (goal.targetAmount - goal.currentAmount) / rate;
  return format(addMonths(new Date(), Math.ceil(monthsLeft)), "MMM yyyy");
}

export default function Goals() {
  const goals = useGoals();
  const accounts = useAccounts();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | undefined>();
  const [contributing, setContributing] = useState<Goal | undefined>();
  const [contribution, setContribution] = useState("");
  const [contributionSource, setContributionSource] = useState(NONE);
  const [deleting, setDeleting] = useState<Goal | undefined>();

  const loading = !goals || !accounts;

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: { name: "", targetAmount: "", deadline: "", accountId: NONE },
  });

  function openForm(goal?: Goal) {
    setEditing(goal);
    form.reset(
      goal
        ? {
            name: goal.name,
            targetAmount: String(goal.targetAmount),
            deadline: goal.deadline ?? "",
            accountId: goal.accountId ?? NONE,
          }
        : { name: "", targetAmount: "", deadline: "", accountId: NONE },
    );
    setFormOpen(true);
  }

  async function onSubmit(values: GoalFormValues) {
    const payload = {
      name: values.name,
      targetAmount: Number(values.targetAmount),
      ...(values.deadline ? { deadline: values.deadline } : {}),
      ...(values.accountId && values.accountId !== NONE
        ? { accountId: values.accountId }
        : {}),
    };
    if (editing) {
      await updateGoal(editing.id, {
        ...payload,
        deadline: values.deadline || undefined,
        accountId:
          values.accountId && values.accountId !== NONE
            ? values.accountId
            : undefined,
      });
      toast.success("Goal updated");
    } else {
      await createGoal({
        ...payload,
        currentAmount: 0,
        createdAt: format(new Date(), "yyyy-MM-dd"),
      });
      toast.success("Goal created");
    }
    setFormOpen(false);
  }

  async function submitContribution() {
    const amount = Number(contribution);
    if (!contributing || !Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    await contributeToGoal(
      contributing,
      amount,
      contributionSource !== NONE ? contributionSource : undefined,
    );
    toast.success(`Added to ${contributing.name}`);
    setContributing(undefined);
    setContribution("");
    setContributionSource(NONE);
  }

  const accountName = useMemo(
    () => new Map((accounts ?? []).map((a) => [a.id, a.name])),
    [accounts],
  );

  return (
    <>
      <PageHeader
        title="Goals"
        description="Savings targets with progress tracking."
        actions={
          <Button onClick={() => openForm()}>
            <Plus className="size-4" /> Add goal
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals yet"
          description="Create a savings goal to start tracking progress."
          actionLabel="Add goal"
          onAction={() => openForm()}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {goals.map((goal) => {
            const pct = Math.min(
              (goal.currentAmount / goal.targetAmount) * 100,
              100,
            );
            const done = goal.currentAmount >= goal.targetAmount;
            const projection = projectedCompletion(goal);
            return (
              <Card key={goal.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      {goal.name}
                      {done && <PartyPopper className="size-4 text-amber-500" />}
                    </CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {goal.accountId
                        ? `Linked to ${accountName.get(goal.accountId) ?? "account"}`
                        : "No linked account"}
                      {goal.deadline &&
                        ` · due ${formatDisplayDate(goal.deadline)}`}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="-mt-1 size-7">
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openForm(goal)}>
                        <Pencil className="size-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setDeleting(goal)}
                      >
                        <Trash2 className="size-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent>
                  <div className="mb-2 flex items-baseline justify-between">
                    <span>
                      <CurrencyDisplay
                        amount={goal.currentAmount}
                        className="text-xl font-semibold"
                      />{" "}
                      <span className="text-sm text-muted-foreground">
                        of <CurrencyDisplay amount={goal.targetAmount} />
                      </span>
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(pct)}%
                    </span>
                  </div>
                  <Progress value={pct} className="mb-3" />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {done
                        ? "Goal reached!"
                        : projection
                          ? `On track for ${projection}`
                          : "Contribute to see a projection"}
                    </p>
                    {!done && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setContributing(goal)}
                      >
                        <PiggyBank className="size-4" /> Contribute
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit goal" : "New goal"}</DialogTitle>
            <DialogDescription>
              Set a target amount, and optionally a deadline and linked account.
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
                      <Input placeholder="e.g. Emergency fund" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="targetAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target amount</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="deadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Deadline{" "}
                        <span className="font-normal text-muted-foreground">
                          (optional)
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Linked account{" "}
                      <span className="font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? NONE}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE}>None</SelectItem>
                        {(accounts ?? []).map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">{editing ? "Save" : "Create"}</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!contributing}
        onOpenChange={(o) => {
          if (!o) {
            setContributing(undefined);
            setContribution("");
            setContributionSource(NONE);
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Contribute to {contributing?.name}</DialogTitle>
            <DialogDescription>
              {contributing?.accountId
                ? "Choosing a source account records a transfer to the linked account."
                : "This updates the goal's saved amount."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contribution">Amount</Label>
              <Input
                id="contribution"
                type="number"
                step="0.01"
                min="0"
                value={contribution}
                onChange={(e) => setContribution(e.target.value)}
                autoFocus
              />
            </div>
            {contributing?.accountId && (
              <div className="space-y-2">
                <Label>From account (optional)</Label>
                <Select
                  value={contributionSource}
                  onValueChange={setContributionSource}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No transfer</SelectItem>
                    {(accounts ?? [])
                      .filter((a) => a.id !== contributing.accountId)
                      .map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button className="w-full" onClick={submitContribution}>
              Add contribution
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(undefined)}
        title={`Delete ${deleting?.name}?`}
        description="The goal will be removed. Transactions created by contributions are kept."
        onConfirm={async () => {
          if (deleting) {
            await deleteGoal(deleting.id);
            toast.success(`${deleting.name} deleted`);
            setDeleting(undefined);
          }
        }}
      />
    </>
  );
}
