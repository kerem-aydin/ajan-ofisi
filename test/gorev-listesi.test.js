import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { listeyiOku, sabahPlani, sabahMesaji } from "../src/gorev-listesi.js";

const md = fs.readFileSync(new URL("../ornek/GOREVLER.md", import.meta.url), "utf8");

test("reads sections and K/C lines", () => {
  const b = listeyiOku(md);
  assert.deepEqual(b.map((x) => x.harf), ["A", "B", "C", "D"]);
  assert.equal(b[0].gorevler.length, 3);
  assert.equal(b[0].gorevler[0].kim, "C");
});

test("morning plan: first open K per section, sections without K are skipped, at most three", () => {
  const p = sabahPlani(md);
  assert.deepEqual(p.map((x) => x.bolum[0]), ["A", "B", "D"]);
  assert.match(p[0].is, /first pilot customer/);
});

test("ticked lines and foreign headings are ignored; CRLF works", () => {
  const p = sabahPlani("## A · X\r\n- [x] K · done\r\n- [ ] K · open\r\n## Notes\r\n- [ ] K · not a task section\r\n");
  assert.deepEqual(p, [{ bolum: "A · X", is: "open" }]);
});

test("empty plan has a friendly message", () => {
  assert.match(sabahMesaji([], new Date("2026-10-13T06:00:00Z")), /bekleyen iş yok/);
});
