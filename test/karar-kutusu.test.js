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

test("a damaged file is not treated as empty and is not overwritten", () => {
  const dosya = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "kutu-")), "k.json");
  fs.writeFileSync(dosya, '{"0123abcd": {"soru": "Publish?", "cevap": null');
  const k = kararKutusu(dosya);
  assert.throws(() => k.sor("New question", ["a", "b"]), /damaged/);
  assert.throws(() => k.bekleyenler(), /damaged/);
  assert.equal(fs.readFileSync(dosya, "utf8"), '{"0123abcd": {"soru": "Publish?", "cevap": null', "file left untouched");
});

test("two processes asking at the same time do not lose each other's questions", async () => {
  /* Without the lock, both read the same file, both add one question, and the
     second write erases the first. Two real processes, 25 questions each. */
  const dosya = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "kutu-")), "k.json");
  const modul = new URL("../src/karar-kutusu.js", import.meta.url).href;
  const kod = `import { kararKutusu } from ${JSON.stringify(modul)};
    const k = kararKutusu(${JSON.stringify(dosya)});
    for (let i = 0; i < 25; i++) k.sor("q" + i, ["a", "b"]);`;
  const { spawn } = await import("node:child_process");
  const calistir = () => new Promise((tamam, hata) => {
    const p = spawn(process.execPath, ["--input-type=module", "-e", kod], { stdio: "inherit" });
    p.on("exit", (c) => (c === 0 ? tamam() : hata(new Error("exit " + c))));
  });
  await Promise.all([calistir(), calistir()]);
  assert.equal(kararKutusu(dosya).bekleyenler().length, 50);
  assert.ok(!fs.existsSync(dosya + ".lock"), "lock released");
});
