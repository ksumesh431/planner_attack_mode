import { useEffect, useState } from "react";

import { todayKey } from "../lib/date";

export function useToday(): string {
  const [today, setToday] = useState(todayKey);

  useEffect(() => {
    const update = () => setToday(todayKey());
    const interval = window.setInterval(update, 60_000);

    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return today;
}
