// Minimal Telegram Bot API client. No dependencies; Node 18+ (global fetch).
// The office only needs four calls: send a message, send one with buttons,
// acknowledge a button press, and long-poll for updates.

const API = "https://api.telegram.org";
const PARCA = 3900; // Telegram's hard limit is 4096 characters per message

export function telegram(token, { fetchFn = fetch } = {}) {
  if (!token) throw new Error("telegram: token missing (read it from the environment, never from code)");

  async function cagir(yontem, govde) {
    const r = await fetchFn(`${API}/bot${token}/${yontem}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(govde),
    });
    const j = await r.json();
    if (!j.ok) throw new Error(`telegram ${yontem}: ${j.description}`);
    return j.result;
  }

  return {
    cagir,

    /** Sends text, split into chunks under the 4096-character limit. */
    async gonder(sohbet, metin) {
      const sonuc = [];
      for (let i = 0; i < metin.length; i += PARCA) {
        sonuc.push(await cagir("sendMessage", {
          chat_id: sohbet,
          text: metin.slice(i, i + PARCA),
          link_preview_options: { is_disabled: true },
        }));
      }
      return sonuc;
    },

    /** Sends a message with one row of inline buttons: [{ metin, veri }]. */
    dugmeli(sohbet, metin, dugmeler) {
      return cagir("sendMessage", {
        chat_id: sohbet,
        text: metin,
        reply_markup: { inline_keyboard: [dugmeler.map((d) => ({ text: d.metin, callback_data: d.veri }))] },
      });
    },

    /** Long polling. Yields updates forever; `offset` makes each one arrive exactly once. */
    async *dinle({ bekleme = 50, turler = ["message", "callback_query"] } = {}) {
      let offset = 0;
      for (;;) {
        const gelen = await cagir("getUpdates", { offset, timeout: bekleme, allowed_updates: turler });
        for (const g of gelen) {
          offset = g.update_id + 1;
          yield g;
        }
      }
    },
  };
}
