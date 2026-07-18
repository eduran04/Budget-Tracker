import { Loader2 } from "lucide-react";
import logo from "@/assets/logo.png";

/**
 * Shown in the content area while the database initializes. The first launch
 * seeds demo data, which takes noticeably longer, so we explain the wait.
 */
export function BootScreen() {
  const firstRun = !localStorage.getItem("seeded");
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
      <img
        src={logo}
        alt=""
        className="size-14 rounded-[14px] object-cover"
      />
      <Loader2 className="size-7 animate-spin" />
      <p className="text-sm">
        {firstRun ? "Setting up demo data…" : "Loading…"}
      </p>
    </div>
  );
}
