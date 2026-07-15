import { useSyncExternalStore } from "react";
import { getCurrency } from "@/lib/currency";

function subscribe(cb: () => void) {
  window.addEventListener("currency-change", cb);
  return () => window.removeEventListener("currency-change", cb);
}

/** Reactive currency code; updates everywhere when Settings changes it. */
export function useCurrency() {
  return useSyncExternalStore(subscribe, getCurrency);
}
