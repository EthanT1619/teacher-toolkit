# Teacher Toolkit v1.0 Specification

**Status:** Phase 0 in progress (core i18n + tests; tools not wired)  
**Last updated:** 2026-07-29
**Related docs:** [i18n-spec.md](./i18n-spec.md), [release-checklist.md](./release-checklist.md)

---

## 1. Purpose

This document defines the scope, policies, and rollout plan for promoting Teacher Toolkit from its current beta/mixed state to **v1.0**:

1. **Stable release** — Remove Beta (β) labels and ship four study tools as formal versions.
2. **Shared internationalization (i18n)** — English as the default UI language, with optional Korean across all tools.

Individual tool implementation is out of scope for this document; see linked specs for i18n and release criteria.

---

## 2. Scope

### 2.1 In scope

| Area | Description |
|------|-------------|
| Shared i18n layer | `shared/` modules, locale files, language toggle |
| Home page | `index.html` (menus, prep checklist, makeup widget chrome) |
| Help center | Incremental EN/KO per tool phase — not bulk-translated |
| All menu tools (23) | Per-tool UI string extraction and i18n wiring |
| Beta graduation | grammar-checkpoint, sentence-kitchen, story-forge, 5w1h-factory |
| Navigation labels | Menu names, section badges, home link |
| Makeup Scheduler **link only** | Separate task: external Supabase URL (folder not modified) |

### 2.2 Out of scope

| Area | Policy |
|------|--------|
| `makeup-scheduler/` folder and internal code | **Do not modify**; i18n **independent** of Toolkit locale |
| Makeup Scheduler menu → Supabase URL | **Separate task** after tool i18n phases |
| Bulk alert/confirm → custom modal | **Deferred** — native dialogs remain in v1.0; strings are still i18n targets |
| Educational content translation | English learning content stays in English (see [i18n-spec.md §3](./i18n-spec.md#3-translation-scope)) |
| Supabase widget logic changes | Unless required for i18n chrome only |

### 2.3 External dependency

- **Makeup Scheduler (synced):** `https://ethant1619.github.io/mkup-scheduler-synced/` (or current production URL)
- Widget “Open makeup manager” link already points to sibling deploy; menu link will align in a later step.

---

## 3. Language policy (confirmed)

| Rule | Detail |
|------|--------|
| New user default | **English (`en`)** |
| Existing user | No `toolkit-language`, but any legacy Toolkit `localStorage` key → **one-time `ko`**, persisted |
| Persistence | Whenever locale is resolved or changed → always write **`toolkit-language`** |
| Shared preference | One choice for all Toolkit pages (except makeup-scheduler app internals) |
| Storage key | `toolkit-language` |
| Supported values | `en`, `ko` |
| HTML lang | `document.documentElement.lang` synced on init and `setLocale()` |
| Missing translation | English fallback |
| Invalid stored value | Re-run new/existing detection; persist result |

Full rules: [i18n-spec.md §2](./i18n-spec.md#2-language-policy-confirmed).

---

## 4. Translation scope (summary)

**Translate:** UI chrome — buttons, labels, instructions, errors, placeholders, `title`, `aria-label`, tooltips, help text, menu names.

**Do not translate:**

- English learning content: vocabulary, sentences, grammar rules/examples, story body text, game prompts meant for students
- User-entered data: student names, custom word lists, saved sentences, preset names (unless user chose to name them in either language)
- Internal storage identifiers: enum keys, preset IDs, migration version tags

**Separate display from storage:** Saved data must use stable internal keys/IDs; rendered labels come from i18n or user input, never from translated UI strings written back to storage.

Details: [i18n-spec.md §3](./i18n-spec.md#3-translation-scope).

---

## 5. Storage and migration policy

| Rule | Detail |
|------|--------|
| Existing keys | **Preserve** all current `localStorage` keys and schemas (see audit inventory) |
| `localStorage.clear()` | **Forbidden** in toolkit code |
| Schema changes | Require explicit migration function, version bump, and release-note entry |
| i18n keys | New key `toolkit-language` only for locale preference |
| Display vs storage | Never persist translated UI text as canonical field values |

Known keys (unchanged in v1.0 unless a tool already plans migration):

- `teacherChecklistClasses`, `teacherChecklistItems`, `teacherChecklistState`, `teacherChecklistCurrentClassId`
- `helpLastSeenDate`
- `makeup-scheduler-schedules`, `makeup-scheduler-panel-collapse` (scheduler folder untouched; widget may read schedules)
- Tool-specific: `participation-tracker-v3`, `classTeamMaker`, `classRandomPicker`, `ladderGame`, `mysteryBoxPicker`, `diceChanceGame`, `juldarigiGame`, `tongAjossiGame`, `vocab-study-mobile-presets`, `story-forge-presets`, `sentence-kitchen-presets`, `5w1h-factory-settings`

---

## 6. Tool registry

Stable **`tool-id`** values (used in i18n keys and checklists):

| Category | tool-id | Path | Beta | Notes |
|----------|---------|------|------|-------|
| Home | `home` | `/index.html` | — | Menus, checklist, widget |
| Help | `help` | `/help/` | — | Guides, FAQ, updates |
| Utils | `classroom-timer` | `/classroom-timer/` | — | Pilot candidate |
| | `makeup-scheduler` | `/makeup-scheduler/` | — | **Code excluded**; link swap only |
| | `participation-tracker` | `/participation-tracker/` | — | |
| | `class-random-picker` | `/class-random-picker/` | — | |
| | `team-maker` | `/team-maker/` | — | |
| | `edu-scoreboard` | `/edu-scoreboard/` | — | |
| Study | `grammar-checkpoint` | `/grammar-checkpoint/` | **β** | |
| | `phonics-hunt` | `/phonics-hunt/` | — | |
| | `sentence-battle` | `/sentence-battle/` | — | |
| | `sentence-kitchen` | `/sentence-kitchen/` | — | **β** |
| | `story-forge` | `/story-forge/` | — | **β** |
| | `vocab-study-mobile` | `/vocab-study-mobile/` | — | |
| | `5w1h-factory` | `/5w1h-factory/` | — | **β**; official name **WH Factory** |
| Activity | `barrel-game` | `/barrel-game/` | — | Stub redirect; i18n on `tong-ajossi.html` only |
| | `castle-siege` | `/castle-siege/` | — | |
| | `fortress-battle` | `/fortress-battle/` | — | Official name **Fortress Battle** |
| | `dice-chance` | `/dice-chance/` | — | Official name **Dice Chance** |
| | `ladder-game` | `/ladder-game/` | — | |
| | `mystery-box-picker` | `/mystery-box-picker/` | — | |
| | `nerfgun-board` | `/nerfgun-board/` | — | |
| | `pirate-race` | `/pirate-race/` | — | |
| | `treasure-hunt` | `/treasure-hunt/` | — | |
| | `juldarigi` | `/juldarigi/` | — | Official name **Tug of War** |

---

## 7. Formal release (v1.0) promotion criteria

A tool (or the toolkit as a whole) is **v1.0-ready** when all items in [release-checklist.md](./release-checklist.md) pass for that scope.

Summary:

1. **Beta strings removed** — No `β`, “beta”, or “Beta” in title, headings, menus, or help for graduated tools.
2. **Regression** — Core user flows work on desktop; no functional regressions vs. current main.
3. **i18n** — English default; Korean toggle works; language persists across refresh and navigation.
4. **Console** — No errors on load and primary flows (warnings documented if accepted).
5. **Storage** — Existing user data loads unchanged after i18n work.
6. **Mobile** — Basic usability on a phone viewport (layout usable, primary actions reachable).
7. **Help** — Relevant guide updated for v1.0 naming and language toggle.

Native `alert` / `confirm` may remain; their **message text** must be translated via i18n.

---

## 8. Recommended work order

Execute in sequence; do not skip shared i18n foundation.

| Phase | Work item | Rationale |
|-------|-----------|-----------|
| **0** | Shared i18n (`shared/i18n.js`, locales, toggle UI pattern) | Single source of truth for `toolkit-language` |
| **1** | **Pilot:** one low-risk non-beta tool (`classroom-timer` recommended) | Validates integration pattern before wide rollout |
| **2** | Home (`home`) | Menus, checklist, widget labels; highest traffic |
| **3** | WH Factory (`5w1h-factory`) | Smallest beta; single-file |
| **4** | Grammar Checkpoint (`grammar-checkpoint`) | Beta; mostly English gameplay |
| **5** | Story Forge (`story-forge`) | Beta; heavier Korean UI |
| **6** | Sentence Kitchen (`sentence-kitchen`) | Beta; highest complexity |
| **7** | Remaining tools + help | Monoliths, activities, utilities |
| **8** | Makeup Scheduler menu link → external URL | **Separate task**; no folder edits |
| **9** | Final toolkit-wide release checklist | Ship v1.0 |

Parallel work within Phase 7 is allowed for independent tools after the pilot pattern is documented.

---

## 9. Shared module plan (Phase 0 — implemented)

```
shared/
  i18n-core.js         # Pure logic + LEGACY_STORAGE_KEYS
  i18n.js              # ES module (import.meta.url locale paths)
  i18n.test.js         # npm test
  locales/en.json, ko.json
  toolkit-home.js      # i18n wiring in Phase 1+
```

Load pattern (Phase 1+):

```html
<script type="module">
  import { initI18n, setLocale, t } from '../shared/i18n.js';
  await initI18n();
</script>
```

---

## 10. Official display names (confirmed)

**One canonical name** per tool for menu, `<title>`, `<h1>`, and help guide title. Folder and `tool-id` unchanged.

Canonical English names live in `shared/locales/en.json` → `tool.<tool-id>.title`. Examples of past inconsistencies now unified:

| tool-id | Official name (EN) |
|---------|-------------------|
| `fortress-battle` | Fortress Battle (was “Cannon Game” in menu) |
| `dice-chance` | Dice Chance (was “Dice Tool” in menu) |
| `juldarigi` | Tug of War |
| `5w1h-factory` | WH Factory |

Do **not** use separate `menuLabel` keys unless a future product decision explicitly requires it.

---

## 11. Success metrics

- All four beta study tools ship without β label.
- User can switch EN ↔ KO from home (and ideally from a shared header control on tool pages).
- No reported data loss from existing `localStorage` keys.
- Help center documents language switching and v1.0 tool names.

---

## 12. Confirmed policies (2026-07-29)

1. **New users** → English default.
2. **Existing users** → no `toolkit-language` + any legacy Toolkit key → one-time Korean, persisted.
3. **Locale decided** → always persist `toolkit-language`.
4. **makeup-scheduler** → Toolkit i18n independent; no internal edits; Supabase link swap is separate.
5. **Sentence Kitchen legacy data** → investigate at Phase 6; explicit migration + mapping table; **no auto inference**.
6. **Help** → incremental EN/KO with common + Beta four first; no full historical update-notes translation.
7. **Display names** → single official name (menu, title, h1, help); keep folder/tool-id.
8. **Locale paths** → `import.meta.url` relative in `shared/i18n.js`; no hardcoded deploy root.
9. **`5w1h-factory`** → string tool-id; bracket-access parser in `i18n-core.js`.
10. **barrel-game** → stub unchanged; i18n only on `tong-ajossi.html`.
11. **Open native alert/confirm** → no locale refresh (v1.0 accepted edge case).
12. **Phase 0** → shared i18n + tests only; **no individual tool feature changes**.

---

## 13. Document map

| Document | Contents |
|----------|----------|
| [i18n-spec.md](./i18n-spec.md) | API, key naming, DOM patterns, content boundaries |
| [release-checklist.md](./release-checklist.md) | Per-tool and global verification lists |
