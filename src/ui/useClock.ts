import { useEffect, useState } from "react";

/** Often enough that the display never lags a whole second behind the clock. */
const TICK_MS = 250;

/**
 * The current time in milliseconds, re-read every tick while `running`. Callers compute
 * from timestamps, so a hidden tab's throttled timers delay the display but never the count.
 */
export function useClock(running: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [running]);
  return now;
}
