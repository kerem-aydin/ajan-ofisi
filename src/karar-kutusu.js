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

export function kararKutusu(dosya) {
  const oku = () => { try { return JSON.parse(fs.readFileSync(dosya, "utf8")); } catch { return {}; } };
  const yaz = (d) => { // write-then-rename: a crash never leaves half a file behind
    fs.writeFileSync(`${dosya}.tmp`, JSON.stringify(d, null, 2));
    fs.renameSync(`${dosya}.tmp`, dosya);
  };

  return {
    /** Registers a question and returns the button row to send. */
    sor(soru, secenekler) {
      if (!Array.isArray(secenekler) || secenekler.length < 2) throw new Error("a decision needs at least two options");
      const id = crypto.randomBytes(4).toString("hex");
      const d = oku();
      d[id] = { soru, secenekler, soruldu: new Date().toISOString(), cevap: null };
      yaz(d);
      return { id, dugmeler: secenekler.map((s, i) => ({ metin: s, veri: dugmeVerisi(id, i) })) };
    },

    /**
     * Handles a callback_query. Returns the stored decision, or null if the
     * button is not ours, unknown, or already answered (double taps happen).
     */
    cevapla(callbackVerisi, kim) {
      const c = dugmeCoz(callbackVerisi);
      if (!c) return null;
      const d = oku();
      const k = d[c.id];
      if (!k || k.cevap !== null || !(c.secim in k.secenekler)) return null;
      k.cevap = { secim: k.secenekler[c.secim], kim, zaman: new Date().toISOString() };
      yaz(d);
      return { id: c.id, ...k };
    },

    bekleyenler() {
      return Object.entries(oku()).filter(([, k]) => k.cevap === null).map(([id, k]) => ({ id, ...k }));
    },
  };
}
