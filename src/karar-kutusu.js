// Decision box: the office asks, the owner taps a button, the answer is stored.
//
// Rule: agents prepare, the owner decides. Anything that spends money, is
// visible to customers or cannot be undone becomes a question with buttons
// instead of an action. The agent keeps working on everything else.

import fs from "node:fs";
import crypto from "node:crypto";

const ONEK = "karar:";

/** callback_data is limited to 64 bytes, so it carries only an id and an index. */
export function dugmeVerisi(id, secim) {
  const v = `${ONEK}${id}:${secim}`;
  if (Buffer.byteLength(v) > 64) throw new Error("callback_data over 64 bytes");
  return v;
}

export function dugmeCoz(veri) {
  const m = typeof veri === "string" && veri.match(/^karar:([a-f0-9]{8}):(\d{1,2})$/);
  return m ? { id: m[1], secim: Number(m[2]) } : null;
}

export function kararKutusu(dosya, { kilitBeklemeMs = 3000, bayatKilitMs = 30_000 } = {}) {
  /* A missing file is an empty box. A file that exists but cannot be read is
     NOT: treating it as empty would let the next question overwrite every
     stored decision. So it throws and the file is left as it is. */
  const oku = () => {
    let metin;
    try { metin = fs.readFileSync(dosya, "utf8"); } catch (e) {
      if (e.code === "ENOENT") return {};
      throw e;
    }
    try { return JSON.parse(metin); } catch (e) {
      throw new Error(`decision file is damaged, left untouched: ${dosya} (${e.message})`);
    }
  };
  const yaz = (d) => { // write-then-rename: a crash never leaves half a file behind
    fs.writeFileSync(`${dosya}.tmp`, JSON.stringify(d, null, 2));
    fs.renameSync(`${dosya}.tmp`, dosya);
  };

  /* Read-change-write under a lock file, so two processes (say, the listener
     and a script asking a new question) cannot lose each other's change or
     both accept the same tap. A lock older than `bayatKilitMs` belonged to a
     process that died and is taken over. */
  const kilit = `${dosya}.lock`;
  const kilitli = (is) => {
    const son = Date.now() + kilitBeklemeMs;
    for (;;) {
      try { fs.closeSync(fs.openSync(kilit, "wx")); break; } catch (e) {
        if (e.code !== "EEXIST") throw e;
        try { if (Date.now() - fs.statSync(kilit).mtimeMs > bayatKilitMs) { fs.rmSync(kilit, { force: true }); continue; } } catch { continue; }
        if (Date.now() > son) throw new Error(`decision file is locked by another process: ${kilit}`);
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
      }
    }
    try { return is(); } finally { fs.rmSync(kilit, { force: true }); }
  };

  return {
    /** Registers a question and returns the button row to send. */
    sor(soru, secenekler) {
      if (!Array.isArray(secenekler) || secenekler.length < 2) throw new Error("a decision needs at least two options");
      const id = crypto.randomBytes(4).toString("hex");
      kilitli(() => {
        const d = oku();
        d[id] = { soru, secenekler, soruldu: new Date().toISOString(), cevap: null };
        yaz(d);
      });
      return { id, dugmeler: secenekler.map((s, i) => ({ metin: s, veri: dugmeVerisi(id, i) })) };
    },

    /**
     * Handles a callback_query. Returns the stored decision, or null if the
     * button is not ours, unknown, or already answered (double taps happen).
     */
    cevapla(callbackVerisi, kim) {
      const c = dugmeCoz(callbackVerisi);
      if (!c) return null;
      return kilitli(() => {
        const d = oku();
        const k = d[c.id];
        if (!k || k.cevap !== null || !(c.secim in k.secenekler)) return null;
        k.cevap = { secim: k.secenekler[c.secim], kim, zaman: new Date().toISOString() };
        yaz(d);
        return { id: c.id, ...k };
      });
    },

    bekleyenler() {
      return Object.entries(oku()).filter(([, k]) => k.cevap === null).map(([id, k]) => ({ id, ...k }));
    },
  };
}
