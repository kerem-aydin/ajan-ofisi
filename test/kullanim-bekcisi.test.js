import { test } from "node:test";
import assert from "node:assert/strict";
import { kullanimiOku, karar, sahipIzleyici } from "../src/kullanim-bekcisi.js";

const olay = (b, h) => JSON.stringify({ type: "rate_limit_event", rate_limit_info: { status: "allowed",
  unifiedWindows: { five_hour: { utilization: b, resetsAt: 1791884400 }, seven_day: { utilization: h, resetsAt: 1792166400 } } } });

test("reads the last rate_limit_event, rounds up", () => {
  const cikti = ["{\"type\":\"system\"}", olay(0.04, 0.2), "{\"type\":\"assistant\"}", olay(0.561, 0.2), "{\"type\":\"result\""].join("\n");
  assert.deepEqual(kullanimiOku(cikti), { besSaat: 57, haftalik: 20, sifirlanma: 1791884400 });
});

test("no event means unknown, and the caller treats unknown as full", () => {
  assert.equal(kullanimiOku("You've hit your session limit · resets 12:50pm"), null);
});

test("policy: start low, stop at the ceiling, always yield to the owner", () => {
  const k = (b, h = 10) => ({ besSaat: b, haftalik: h });
  assert.equal(karar({ kullanim: k(10), sahipEtkin: false, calisiyor: false }), "basla");
  assert.equal(karar({ kullanim: k(45), sahipEtkin: false, calisiyor: false }), "bekle");
  assert.equal(karar({ kullanim: k(50), sahipEtkin: false, calisiyor: true }), "devam");
  assert.equal(karar({ kullanim: k(55), sahipEtkin: false, calisiyor: true }), "durdur");
  assert.equal(karar({ kullanim: k(10, 70), sahipEtkin: false, calisiyor: false }), "bekle");
  assert.equal(karar({ kullanim: k(0), sahipEtkin: true, calisiyor: true }), "durdur");
  assert.equal(karar({ kullanim: k(0), sahipEtkin: true, calisiyor: false }), "bekle");
});

test("owner activity: a changed signature means active for the window", () => {
  let t = 0;
  const etkin = sahipIzleyici({ pencereMs: 1000, simdi: () => t });
  assert.equal(etkin("a"), true);
  t = 1500; assert.equal(etkin("a"), false);
  assert.equal(etkin("b"), true);
});
