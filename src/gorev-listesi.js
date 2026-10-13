// The task list is a plain Markdown file that people and agents both edit.
//
//   ## A · Product
//   - [ ] K · Call the first customer        <- K: needs the owner's hands
//   - [ ] C · Draft the offer page            <- C: an agent can do it
//
// Order is priority. The morning plan sends the owner only the first open K
// line of each section, at most three. A finished task is deleted, not ticked:
// history lives in git, and a list of done items slowly buries the open ones.

const BOLUM = /^##\s+([A-Z])\s*·\s*(.+?)\s*$/;
const GOREV = /^\s*-\s*\[( |x)\]\s*([KC])\s*·\s*(.+?)\s*$/;

export function listeyiOku(md) {
  const bolumler = [];
  let su = null;
  for (const satir of md.split(/\r?\n/)) {
    const b = satir.match(BOLUM);
    if (b) { su = { harf: b[1], ad: b[2], gorevler: [] }; bolumler.push(su); continue; }
    if (/^##\s/.test(satir)) { su = null; continue; } // a heading outside the scheme ends the section
    const g = su && satir.match(GOREV);
    if (g) su.gorevler.push({ acik: g[1] === " ", kim: g[2], metin: g[3] });
  }
  return bolumler;
}

export function sabahPlani(md, { enFazla = 3 } = {}) {
  const plan = [];
  for (const b of listeyiOku(md)) {
    const ilk = b.gorevler.find((g) => g.acik && g.kim === "K");
    if (ilk) plan.push({ bolum: `${b.harf} · ${b.ad}`, is: ilk.metin });
    if (plan.length === enFazla) break;
  }
  return plan;
}

export function sabahMesaji(plan, tarih = new Date()) {
  const gun = tarih.toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul", weekday: "long", day: "numeric", month: "long" });
  if (!plan.length) return `Günaydın. ${gun}: senden bekleyen iş yok.`;
  return [`Günaydın. ${gun}, bugün senden beklenenler:`, ...plan.map((p, i) => `${i + 1}. ${p.is} (${p.bolum})`)].join("\n");
}
