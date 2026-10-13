import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { kararKutusu, dugmeCoz, dugmeVerisi } from "../src/karar-kutusu.js";

const yeniKutu = () => kararKutusu(path.join(fs.mkdtempSync(path.join(os.tmpdir(), "kutu-")), "k.json"));

test("ask → tap → stored once; a second tap is ignored", () => {
  const k = yeniKutu();
  const { id, dugmeler } = k.sor("Publish?", ["Yes", "No"]);
  assert.equal(k.bekleyenler().length, 1);
  const c = k.cevapla(dugmeler[1].veri, 42);
  assert.equal(c.id, id);
  assert.equal(c.cevap.secim, "No");
  assert.equal(k.cevapla(dugmeler[0].veri, 42), null);
  assert.equal(k.bekleyenler().length, 0);
});

test("foreign or forged button data is rejected", () => {
  const k = yeniKutu();
  k.sor("Q", ["a", "b"]);
  for (const v of ["other:1", "karar:zzzzzzzz:0", "karar:deadbeef:0", "karar:deadbeef:99", null]) assert.equal(k.cevapla(v), null);
  assert.equal(dugmeCoz("karar:0123abcd:7").secim, 7);
});

test("a decision needs two options; callback data stays under 64 bytes", () => {
  assert.throws(() => yeniKutu().sor("Q", ["only"]));
  assert.ok(Buffer.byteLength(dugmeVerisi("0123abcd", 99)) <= 64);
});
