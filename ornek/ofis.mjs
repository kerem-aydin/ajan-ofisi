// Example wiring. Secrets come from the environment only:
//   TG_TOKEN=... TG_SOHBET=... node ornek/ofis.mjs sabah  ornek/GOREVLER.md
//   TG_TOKEN=... TG_SOHBET=... node ornek/ofis.mjs sor    "Publish the new page?" Yes No
//   TG_TOKEN=... TG_SOHBET=... node ornek/ofis.mjs dinle
//   node ornek/ofis.mjs olc                      (prints Claude usage, needs the claude CLI)
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { telegram, kararKutusu, sabahPlani, sabahMesaji, kullanimiOlc } from "../src/index.js";

const [komut, ...arg] = process.argv.slice(2);
const sohbet = process.env.TG_SOHBET;
const kutu = kararKutusu(fileURLToPath(new URL("./kararlar.json", import.meta.url)));

if (komut === "olc") {
  console.log(kullanimiOlc());
} else {
  const tg = telegram(process.env.TG_TOKEN);
  if (komut === "sabah") {
    await tg.gonder(sohbet, sabahMesaji(sabahPlani(fs.readFileSync(arg[0] ?? new URL("./GOREVLER.md", import.meta.url), "utf8"))));
  } else if (komut === "sor") {
    const [soru, ...secenekler] = arg;
    const { dugmeler } = kutu.sor(soru, secenekler);
    await tg.dugmeli(sohbet, soru, dugmeler);
  } else if (komut === "dinle") {
    for await (const g of tg.dinle()) {
      const q = g.callback_query;
      if (!q || String(q.message?.chat?.id) !== String(sohbet)) continue; // only the owner's chat may decide
      const k = kutu.cevapla(q.data, q.from?.id);
      await tg.cagir("answerCallbackQuery", { callback_query_id: q.id, text: k ? `Saved: ${k.cevap.secim}` : "Already answered" });
      if (k) await tg.cagir("editMessageText", { chat_id: sohbet, message_id: q.message.message_id, text: `${k.soru}\n→ ${k.cevap.secim}` });
    }
  } else {
    console.error("usage: ofis.mjs sabah [file] | sor <question> <option...> | dinle | olc");
    process.exit(1);
  }
}
