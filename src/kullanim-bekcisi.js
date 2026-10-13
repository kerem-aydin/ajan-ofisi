// Usage guard for background coding agents that share the owner's subscription.
//
// What went wrong (October 2026): background research agents were allowed to
// take over when another agent hit its limit. The guard read usage from a file
// that only an *interactive* session keeps fresh. The owner closed the
// terminal, the file went stale, the guard read "stale" as "free", and two
// agents used the whole five-hour window in 22 minutes. That evening the owner
// had nothing left to work with.
//
// Three rules came out of it:
//   1. Measure, do not assume. Headless `claude -p --output-format stream-json
//      --verbose` emits a `rate_limit_event` with account-wide utilization.
//      A one-word run on the smallest model is enough to read it.
//   2. Background work stops at a ceiling (default 55%) and only starts well
//      below it (default 40%), so the owner always keeps the larger share.
//   3. The owner comes first: if their interactive session was active in the
//      last 30 minutes, background agents do not start, and running ones stop.

import { spawnSync } from "node:child_process";
import os from "node:os";

/** Reads the last rate_limit_event from stream-json output. Pure; easy to test. */
export function kullanimiOku(ciktiMetni) {
  let son = null;
  for (const satir of String(ciktiMetni).split("\n")) {
    if (!satir.includes("rate_limit_event")) continue;
    try {
      const p = JSON.parse(satir).rate_limit_info?.unifiedWindows;
      if (p?.five_hour) son = p;
    } catch { /* partial line */ }
  }
  if (!son) return null;
  const yuzde = (p) => (p ? Math.ceil((p.utilization || 0) * 100) : 100);
  return { besSaat: yuzde(son.five_hour), haftalik: yuzde(son.seven_day), sifirlanma: son.five_hour.resetsAt ?? null };
}

/** Measures real account usage with a tiny headless run. Unknown counts as full. */
export function kullanimiOlc({ komut = "claude", model = "haiku", zamanAsimi = 120_000 } = {}) {
  const r = spawnSync(komut, ["-p", "--model", model, "--output-format", "stream-json", "--verbose", "Reply with one word: ok"],
    { encoding: "utf8", timeout: zamanAsimi, cwd: os.tmpdir(), shell: process.platform === "win32" });
  return kullanimiOku(`${r.stdout ?? ""}\n${r.stderr ?? ""}`) ?? { besSaat: 100, haftalik: 100, sifirlanma: null };
}

/** The whole policy in one function, so it can be tested without a network. */
export function karar({ kullanim, sahipEtkin, calisiyor, basla = 40, dur = 55 }) {
  if (sahipEtkin) return calisiyor ? "durdur" : "bekle";
  const en = Math.max(kullanim.besSaat, kullanim.haftalik);
  if (calisiyor) return en >= dur ? "durdur" : "devam";
  return en < basla ? "basla" : "bekle";
}

/**
 * Is the owner active? Watch any value that only the interactive session
 * changes (here: the usage numbers its status line writes). A change within
 * `pencere` means a human is at the keyboard.
 */
export function sahipIzleyici({ pencereMs = 30 * 60_000, simdi = () => Date.now() } = {}) {
  let sonImza, sonDegisim = simdi();
  return (imza) => {
    if (imza !== sonImza) { sonImza = imza; sonDegisim = simdi(); }
    return simdi() - sonDegisim < pencereMs;
  };
}
