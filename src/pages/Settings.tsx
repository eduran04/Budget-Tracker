import { useRef, useState } from "react";
import {
  Download,
  Monitor,
  Moon,
  Sparkles,
  Sun,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme, type Theme } from "@/hooks/use-theme";
import { useCurrency } from "@/hooks/use-currency";
import { CURRENCIES, setCurrency } from "@/lib/currency";
import { clearAllData, exportAll, importAll } from "@/lib/db";
import { backupSchema } from "@/lib/schemas";
import type { AppBackup } from "@/types";
import { downloadFile } from "@/lib/csv";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const currency = useCurrency();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [pendingImport, setPendingImport] = useState<AppBackup | undefined>();

  async function exportBackup() {
    const backup = await exportAll();
    downloadFile(
      `budget-backup-${backup.exportedAt.slice(0, 10)}.json`,
      JSON.stringify(backup, null, 2),
      "application/json",
    );
    toast.success("Backup exported");
  }

  async function onImportFile(file: File) {
    try {
      const parsed = backupSchema.safeParse(JSON.parse(await file.text()));
      if (!parsed.success) {
        toast.error("Not a valid backup file");
        return;
      }
      setPendingImport(parsed.data as unknown as AppBackup);
    } catch {
      toast.error("Could not read the file as JSON");
    }
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Preferences and data management."
      />

      <div className="grid gap-4 lg:max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Theme preference is saved locally.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={theme} onValueChange={(v) => setTheme(v as Theme)}>
              <TabsList>
                <TabsTrigger value="light">
                  <Sun className="size-4" /> Light
                </TabsTrigger>
                <TabsTrigger value="dark">
                  <Moon className="size-4" /> Dark
                </TabsTrigger>
                <TabsTrigger value="system">
                  <Monitor className="size-4" /> System
                </TabsTrigger>
                <TabsTrigger value="girly-pink">
                  <Sparkles className="size-4" /> Girly Pink
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Currency</CardTitle>
            <CardDescription>
              Used for all amounts across the app.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="currency" className="sr-only">
              Currency
            </Label>
            <Select
              value={currency}
              onValueChange={(v) => {
                setCurrency(v);
                toast.success(`Currency set to ${v}`);
              }}
            >
              <SelectTrigger id="currency" className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Backup & restore</CardTitle>
            <CardDescription>
              Export everything as JSON, or restore from a previous backup.
              Restoring replaces all current data.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImportFile(f);
                e.target.value = "";
              }}
            />
            <Button variant="outline" onClick={exportBackup}>
              <Download className="size-4" /> Export backup
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-4" /> Restore from backup
            </Button>
          </CardContent>
        </Card>

        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle>Danger zone</CardTitle>
            <CardDescription>
              Permanently delete all accounts, categories, transactions,
              recurring rules, and goals.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={() => setConfirmClear(true)}
            >
              <Trash2 className="size-4" /> Clear all data
            </Button>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Clear all data?"
        description="Every account, transaction, category, recurring rule, and goal will be permanently deleted. Consider exporting a backup first."
        confirmLabel="Delete everything"
        onConfirm={async () => {
          await clearAllData();
          localStorage.removeItem("seeded");
          setConfirmClear(false);
          toast.success("All data cleared");
        }}
      />
      <ConfirmDialog
        open={!!pendingImport}
        onOpenChange={(o) => !o && setPendingImport(undefined)}
        title="Restore from backup?"
        description={
          pendingImport
            ? `This backup from ${pendingImport.exportedAt.slice(0, 10)} contains ${pendingImport.accounts.length} accounts and ${pendingImport.transactions.length} transactions. All current data will be replaced.`
            : ""
        }
        confirmLabel="Restore"
        onConfirm={async () => {
          if (pendingImport) {
            await importAll(pendingImport);
            localStorage.setItem("seeded", "1");
            setPendingImport(undefined);
            toast.success("Backup restored");
          }
        }}
      />
    </>
  );
}
