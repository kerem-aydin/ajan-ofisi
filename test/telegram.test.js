import { test } from "node:test";
import assert from "node:assert/strict";
import { telegram } from "../src/telegram.js";

const yanit = (result) => ({ json: async () => ({ ok: true, result }) });

test("every call carries a deadline", async () => {
  let sinyal;
  const tg = telegram("t", { fetchFn: async (_u, o) => { sinyal = o.signal; return yanit({ message_id: 1 }); } });
  await tg.gonder(1, "hi");
  assert.ok(sinyal instanceof AbortSignal, "a hung network must not block forever");
});

test("long polling survives a failed request and continues from the same offset", async () => {
  const istekler = [];
  let n = 0;
  const tg = telegram("t", {
    fetchFn: async (_u, o) => {
      const govde = JSON.parse(o.body);
      istekler.push(govde.offset);
      n++;
      if (n === 1) return yanit([{ update_id: 10 }]);
      if (n === 2) throw new Error("network down");
      return yanit([{ update_id: 11 }]);
    },
  });
  const hatalar = [];
  const gelen = [];
  for await (const g of tg.dinle({ hataBildir: (e) => hatalar.push(e.message) })) {
    gelen.push(g.update_id);
    if (gelen.length === 2) break;
  }
  assert.deepEqual(gelen, [10, 11]);
  assert.deepEqual(hatalar, ["network down"]);
  assert.deepEqual(istekler, [0, 11, 11], "the failed poll is repeated with the same offset");
});
