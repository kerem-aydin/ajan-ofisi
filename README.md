# ajan-ofisi

A one-person company still needs an office. Mine runs on Telegram, and most of
the staff are agents.

This repository is the skeleton of that office: the parts that are useful to
anyone, without the parts that are mine (prompts, scoring, customer data and
keys are not here and never will be). No dependencies, Node 18+.

```
                ┌────────────── GOREVLER.md ──────────────┐
                │  ## A · Product                          │
                │  - [ ] K · Call the first customer       │  K = needs the owner
                │  - [ ] C · Draft the offer page          │  C = an agent can do it
                └───────┬─────────────────────────┬────────┘
                        │ 09:00                    │ all day
                 morning plan                 background agents
              (first open K per section,    (Codex / Claude Code, headless)
                   at most three)                  │
                        │                    usage guard ── measures real usage,
                        ▼                          │       yields to the owner
                  ┌──────────┐   question + buttons │
                  │ Telegram │ ◀──────────────────── decision box
                  └──────────┘ ──── tap ───────────▶ (stored once, double taps ignored)
                        ▲
                      owner
```

## The three parts

### 1. Morning plan from a Markdown task list

People and agents edit the same file. Sections are `## A · Name`, tasks are
`- [ ] K · …` (needs the owner) or `- [ ] C · …` (an agent can do it). Order is
priority. Every morning the owner gets only the first open **K** task of each
section, at most three:

```js
import { sabahPlani, sabahMesaji } from "./src/index.js";
sabahMesaji(sabahPlani(markdown));
// Günaydın. 13 Ekim Salı, bugün senden beklenenler:
// 1. Call the first pilot customer and agree on a start date (A · Product)
// 2. Send the prepared offer for the automation job (B · Freelance)
// 3. Paste the new LinkedIn headline (D · Visibility)
```

Finished tasks are deleted, not ticked. History is in git; a list full of done
items slowly buries the open ones.

### 2. Decision box

Agents prepare, the owner decides. Anything that spends money, is visible to
customers or cannot be undone becomes a question with buttons instead of an
action, and the agent moves on to other work.

```js
const kutu = kararKutusu("kararlar.json");
const { dugmeler } = kutu.sor("Publish the new pricing page?", ["Yes", "Not yet"]);
await tg.dugmeli(chatId, "Publish the new pricing page?", dugmeler);
// later, on callback_query:
kutu.cevapla(query.data, query.from.id); // → { soru, cevap: { secim: "Yes", … } } or null
```

Button data carries only an 8-character id and an index (Telegram allows 64
bytes). A second tap returns `null`. People double-tap on phones, and the second tap should not run the action again.
The example only accepts taps from the owner's chat.

### 3. Usage guard for background coding agents

This part exists because of a real failure.

My research runs day and night on headless coding agents. When one hit its
limit, another took over. The guard read usage from a file that only an
*interactive* session keeps fresh. One evening I closed the terminal, the file
went stale, the guard read "stale" as "free", and two agents used the entire
five-hour window in **22 minutes**. When I sat down to work, nothing was left.

Three rules came out of it:

1. **Measure, do not assume.** Headless Claude Code reports account-wide usage
   in its stream:
   `claude -p --output-format stream-json --verbose` emits a
   `rate_limit_event` with `unifiedWindows.five_hour.utilization`. A one-word
   run on the smallest model is enough to read it.
2. **Background work gets the smaller share.** It starts only below 40% and
   stops itself at 55%.
3. **The owner comes first.** If the owner's interactive session was active in
   the last 30 minutes, background agents do not start, and running ones stop
   and resume later from their own progress files.

```js
const kullanim = kullanimiOlc();            // { besSaat: 13, haftalik: 21, sifirlanma: … }
karar({ kullanim, sahipEtkin, calisiyor }); // "basla" | "devam" | "bekle" | "durdur"
```

The policy is one pure function, so it is tested without a network.

## Try it

```bash
npm test                                             # 11 tests, no network
node ornek/ofis.mjs olc                              # needs the claude CLI
TG_TOKEN=… TG_SOHBET=… node ornek/ofis.mjs sabah ornek/GOREVLER.md
TG_TOKEN=… TG_SOHBET=… node ornek/ofis.mjs sor "Publish?" Yes No
TG_TOKEN=… TG_SOHBET=… node ornek/ofis.mjs dinle
```

Tokens come from the environment only.

*(Names are Turkish because that is who it was written for: `sabah planı` =
morning plan, `karar kutusu` = decision box, `kullanım bekçisi` = usage guard,
`görev listesi` = task list, `sahip` = owner.)*

## What is not here

The office I run on this skeleton also has a problem radar, a night watch for
my website, and research lines that read thousands of public sources. Their
prompts, scoring and data stay private. This repository is the part that is
safe and useful to share.

MIT · [Kerem Aydın](https://github.com/kerem-aydin)
