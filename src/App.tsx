import { lazy, useEffect, useState } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import { initDb, processDueRecurringRules } from "@/lib/db";
import { markStartup } from "@/lib/startup-marks";
import { AppLayout } from "@/components/layout/AppLayout";
import { BootScreen } from "@/components/layout/BootScreen";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Transactions = lazy(() => import("@/pages/Transactions"));
const Accounts = lazy(() => import("@/pages/Accounts"));
const Budgets = lazy(() => import("@/pages/Budgets"));
const Goals = lazy(() => import("@/pages/Goals"));
const Reports = lazy(() => import("@/pages/Reports"));
const Settings = lazy(() => import("@/pages/Settings"));

const deferToIdle = (fn: () => void) =>
  "requestIdleCallback" in window ? requestIdleCallback(fn) : setTimeout(fn, 0);

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // The inline splash from index.html has done its job once React commits.
    document.getElementById("boot-splash")?.remove();
    markStartup("initDbStart");
    initDb().finally(() => {
      markStartup("initDbEnd");
      setReady(true);
      // Materialize overdue recurring transactions after first paint; live
      // queries pick up the generated rows automatically.
      deferToIdle(() => void processDueRecurringRules());
    });
  }, []);

  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          {ready ? (
            <>
              <Route path="/" element={<Dashboard />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/budgets" element={<Budgets />} />
              <Route path="/goals" element={<Goals />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
            </>
          ) : (
            <Route path="*" element={<BootScreen />} />
          )}
        </Route>
      </Routes>
    </HashRouter>
  );
}
