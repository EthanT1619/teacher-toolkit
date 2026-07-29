# Teacher Toolkit v1.0 — Release Checklist

**Status:** Phase 0 in progress  
**Last updated:** 2026-07-29
**Related:** [toolkit-v1-spec.md](./toolkit-v1-spec.md), [i18n-spec.md](./i18n-spec.md)

Use this checklist when promoting a **single tool**, **home/help**, or the **full toolkit** to v1.0.

---

## 1. Global promotion criteria (all releases)

Every release scope must satisfy:

### 1.1 Beta and labeling

- [ ] No `β`, `beta`, or `Beta` in:
  - [ ] `index.html` menu links (for graduated tools)
  - [ ] `help/index.html` tool list and guide titles
  - [ ] Tool `index.html` `<title>` and primary `<h1>`
  - [ ] In-app headers or about text
- [ ] Menu label, page title, and main heading use the **same official name** (`tool.<id>.title` only)

### 1.2 Internationalization

- [ ] Default UI language is **English** for new users (no legacy keys, no `toolkit-language`)
- [ ] **Existing users** (legacy Toolkit keys, no `toolkit-language`) receive **one-time Korean** persisted to storage
- [ ] `toolkit-language` is written whenever locale is first resolved or explicitly changed
- [ ] User can switch to **Korean**
- [ ] `toolkit-language` in `localStorage` updates on explicit change
- [ ] `document.documentElement.lang` is `en` or `ko` matching active locale
- [ ] After **refresh**, language preference is unchanged
- [ ] After **navigating** home → tool → help → another tool, language is unchanged
- [ ] Missing Korean string falls back to English (no blank UI)
- [ ] UI chrome translated: buttons, labels, instructions, errors, placeholders, `title`, `aria-label`
- [ ] English learning content **not** translated (sentences, words, grammar items, story body)
- [ ] User-entered data **not** translated or altered on locale switch

### 1.3 Data integrity

- [ ] No use of `localStorage.clear()`
- [ ] Existing tool `localStorage` keys unchanged in name and schema
- [ ] Saved data created **before** i18n work loads and behaves correctly **after**
- [ ] Internal IDs / enum keys used in storage — not translated display strings
- [ ] If migration was required: migration runs once, is idempotent, and is documented

### 1.4 Quality

- [ ] Core flows pass **regression test** (manual; see §3 per tool)
- [ ] **No console errors** on load and core flows (document accepted warnings)
- [ ] **Mobile basic usability:** layout usable at ~375px width; primary actions reachable; no horizontal scroll blocking main task
- [ ] Native `alert` / `confirm` OK to remain; message text uses i18n keys at show time
- [ ] **Accepted edge case:** already-open native dialogs do not update on locale switch
- [ ] Home link (`toolkit-home`) works from tool path
- [ ] No broken asset or script 404s

### 1.5 Help and docs

- [ ] Help updated for tool name (no beta) — **incremental** EN/KO for this tool’s guide; no bulk help translation required per tool
- [ ] Past update notes in help **not** required to be translated
- [ ] `shared/help-updates-data.js` includes v1.0 / i18n release note when shipping toolkit-wide

### 1.6 Exclusions verified

- [ ] `makeup-scheduler/` folder **not** modified (Toolkit i18n independent; link swap is separate task)
- [ ] Custom modal replacement **not** required for sign-off

---

## 2. Phase gate checklist

### Phase 0 — Shared i18n

- [x] `shared/i18n-core.js` — locale resolve, legacy detection, bracket parser
- [x] `shared/i18n.js` — `initI18n`, `t`, `getLocale`, `setLocale`, `applyToDOM`
- [x] `shared/locales/en.json` and `ko.json` — base keys + official `tool.*.title` registry
- [x] `npm test` (`shared/i18n.test.js`) passes
- [ ] Browser smoke via module import (Phase 1 pilot page)
- [x] Existing-user → ko / new-user → en policy implemented in core
- [x] Locale JSON loaded via `import.meta.url` (no deploy-root hardcoding)
- [ ] Individual tool pages **not** wired yet (by design)

### Phase 1 — Pilot (`classroom-timer`)

- [ ] All Phase 0 items complete
- [ ] Pilot tool fully wired; pattern documented for other tools
- [ ] Language persists into at least one other page

### Phase 2 — Home (`home`)

- [ ] Menus use i18n (all 23 tool links)
- [ ] Prep checklist UI translated; checklist **data** untouched
- [ ] Makeup widget chrome translated (not scheduler app internals)
- [ ] Help FAB `aria-label` translated
- [ ] Language toggle visible on home

### Phases 3–6 — Beta graduation (order)

| Order | tool-id | Beta removed | i18n complete | Regression §3 |
|-------|---------|--------------|---------------|---------------|
| 3 | `5w1h-factory` | [ ] | [ ] | [ ] |
| 4 | `grammar-checkpoint` | [ ] | [ ] | [ ] |
| 5 | `story-forge` | [ ] | [ ] | [ ] |
| 6 | `sentence-kitchen` | [ ] | [ ] | [ ] |

### Phase 7 — Remaining tools

Mark each tool when complete:

**Utilities**

- [ ] `participation-tracker`
- [ ] `class-random-picker`
- [ ] `team-maker`
- [ ] `edu-scoreboard`

**Study**

- [ ] `phonics-hunt`
- [ ] `sentence-battle`
- [ ] `vocab-study-mobile`

**Activities**

- [ ] `barrel-game` / `tong-ajossi.html`
- [ ] `castle-siege`
- [ ] `fortress-battle`
- [ ] `dice-chance`
- [ ] `ladder-game`
- [ ] `mystery-box-picker`
- [ ] `nerfgun-board`
- [ ] `pirate-race`
- [ ] `treasure-hunt`
- [ ] `juldarigi`

**Other**

- [ ] `help`

### Phase 8 — Makeup Scheduler link

- [ ] `index.html` menu href points to external Supabase deployment URL
- [ ] `makeup-scheduler/` directory unchanged
- [ ] Help guide link updated (if applicable) without editing scheduler code
- [ ] Widget external link still valid

### Phase 9 — Toolkit-wide sign-off

- [ ] All Phase 7 boxes checked
- [ ] All four beta study tools graduated
- [ ] Full §1 global criteria pass on live deployment
- [ ] Deploy via GitHub Actions successful

---

## 3. Per-tool regression smoke tests

Minimal manual paths. Extend as needed during QA.

### `home`

- [ ] Add/rename/delete class; add/toggle checklist items
- [ ] Makeup widget shows empty / populated states
- [ ] All menu links open correct tool
- [ ] Language toggle EN ↔ KO updates visible strings

### `classroom-timer` (pilot)

- [ ] Start/pause/reset timer
- [ ] Sound toggle if present
- [ ] Locale switch updates labels

### `5w1h-factory`

- [ ] Paste/input lines; run drag activity
- [ ] Refresh retains settings (`5w1h-factory-settings`)

### `grammar-checkpoint`

- [ ] Select rule/day; approve/reject flow; fix mode
- [ ] Game sentences remain English in both locales
- [ ] Score/result screen works

### `story-forge`

- [ ] Word pile, rounds, compose story
- [ ] Save/load/delete preset (`story-forge-presets`)
- [ ] Copy story; alerts show translated templates

### `sentence-kitchen`

- [ ] Bins, order types, round flow
- [ ] Presets save/load (`sentence-kitchen-presets`)
- [ ] English sentences in bins unchanged in both locales

### `participation-tracker`

- [ ] Add students; increment counts; undo if any
- [ ] Presets; legacy v1/v2 data still loads if test sample exists

### `class-random-picker` / `team-maker`

- [ ] Student list; pick / team generation
- [ ] Preset save/load; confirm dialogs readable in both locales

### `edu-scoreboard`

- [ ] Teams/scores; bomb or special modes if used

### `phonics-hunt` / `castle-siege` / `treasure-hunt`

- [ ] Setup → play → reset round
- [ ] Word/grid config persists where applicable

### `ladder-game`

- [ ] Generate ladder; reveal; **R** new round if documented
- [ ] Presets (`ladderGame`)

### `dice-chance` / `mystery-box-picker`

- [ ] Options/items; roll/pick; presets

### `fortress-battle` / `pirate-race` / `nerfgun-board` / `juldarigi` / `barrel-game`

- [ ] Start game; score/progress; reset
- [ ] `tongAjossiGame` / `juldarigiGame` persistence

### `vocab-study-mobile`

- [ ] Word list; study/test mode; presets (`vocab-study-mobile-presets`)

### `sentence-battle`

- [ ] Battle flow end-to-end

### Sentence Kitchen (`sentence-kitchen`) — migration gate

Before beta removal:

- [ ] Legacy `localStorage` structure documented from real data
- [ ] Explicit mapping table written (no automatic inference migration)
- [ ] Migration idempotent and tested with sample legacy data

### Help (incremental)

- [ ] Common help chrome i18n (Phase 2+)
- [ ] Beta four guides EN/KO when those tools ship
- [ ] Other guides added per tool phase — **not** all at once
- [ ] Open guide modals; search/list navigation
- [ ] New update notes may be bilingual; historical archive not translated

### `makeup-scheduler` (link only)

- [ ] Menu opens external synced app in new tab/window as designed
- [ ] Local `./makeup-scheduler/` still reachable if bookmarked (unchanged folder)

---

## 4. Mobile smoke (sample)

Test on phone or DevTools ~375px for each graduated batch:

- [ ] Home menus open and links work
- [ ] Language toggle accessible
- [ ] Pilot + one monolith tool (`participation-tracker` or `team-maker`)
- [ ] One activity (`castle-siege` or `ladder-game`)

Criteria: no unusable overlap; buttons tappable; text readable without zoom.

---

## 5. Console check procedure

1. Open DevTools → Console
2. Hard refresh tool page
3. Run core flow (§3)
4. Switch locale; repeat core flow
5. Record any errors; fix or file exception before sign-off

---

## 6. Storage verification procedure

1. Before pulling i18n branch: use tool, create recognizable data (named preset, student list, etc.)
2. Note relevant `localStorage` keys in Application tab
3. After i18n work: reload — data present and functionally identical
4. Switch EN/KO — data unchanged
5. Confirm `toolkit-language` is the only new key (unless documented migration)

---

## 7. Sign-off template

```markdown
## Release: [tool-id | home | toolkit-wide] v1.0
- Date:
- Tester:
- Locale tested: EN / KO
- Beta label removed: Y/N/NA
- Storage regression: Pass/Fail
- Mobile smoke: Pass/Fail/NA
- Console clean: Pass/Fail
- Help updated: Y/N
- Notes:
```

---

## 8. Quick reference — Beta tools

| tool-id | Menu text today | Target title (EN) |
|---------|-----------------|-------------------|
| `grammar-checkpoint` | Grammar Checkpoint β | Grammar Checkpoint |
| `sentence-kitchen` | Sentence Kitchen β | Sentence Kitchen |
| `story-forge` | Story Forge β | Story Forge |
| `5w1h-factory` | WH Factory β | WH Factory |

Remove β everywhere simultaneously with each tool’s phase completion.
