# Teacher Toolkit — i18n Specification

**Status:** Phase 0 implemented (core + locales + tests)  
**Last updated:** 2026-07-29  
**Parent:** [toolkit-v1-spec.md](./toolkit-v1-spec.md)

---

## 1. Goals

- Provide one **shared language preference** for the entire Teacher Toolkit site.
- Default UI language: **English**.
- User may switch to **Korean**; choice persists and applies on every page.
- Minimize risk to existing **localStorage** data and English **learning content**.

---

## 2. Language policy (confirmed)

| Item | Specification |
|------|----------------|
| Default locale (new user) | `en` |
| Supported locales | `en`, `ko` |
| Storage key | `toolkit-language` |
| Storage value | `"en"` or `"ko"` string |
| Scope | All Toolkit pages except `makeup-scheduler/` app internals (see §2.3) |
| HTML attribute | `document.documentElement.lang` set to `"en"` or `"ko"` on init and on `setLocale()` |
| **Existing user** | No valid `toolkit-language`, but **any** legacy Toolkit `localStorage` key present → resolve **`ko` once**, then **persist** `toolkit-language=ko` |
| **New user** | No valid `toolkit-language` and no legacy keys → resolve **`en`**, then **persist** `toolkit-language=en` |
| **Persistence** | Once locale is resolved or changed, **always** write `toolkit-language` |
| Valid stored value | Use as-is on init (`persist: false`) |
| Invalid stored value | Re-run new/existing user detection; persist resolved locale |
| Missing translation key | Fallback to **English** value for that key |
| Missing English key | Show key path as last resort (dev signal); must be caught before release |

Legacy keys list: `shared/i18n-core.js` → `LEGACY_STORAGE_KEYS` (includes `participation-tracker-v1` / `v2` / `v3`).

### 2.1 Locale detection (v1.0)

**Do not** auto-detect browser `navigator.language`. Use stored `toolkit-language`, or legacy-key heuristic above, or explicit user toggle via `setLocale()`.

### 2.2 Makeup Scheduler independence

The `makeup-scheduler/` folder is **not** part of Toolkit i18n. Its UI stays as-is. Menu link replacement to the external Supabase deployment is a **separate task** and does not require scheduler code changes.

### 2.3 Allowed edge case (v1.0)

**Native `alert()` / `confirm()`** dialogs that are already open **do not update** when the user switches locale. This is accepted for v1.0. New dialogs use `t()` at show time.

### 2.2 Cross-page consistency

Language must persist when:

- Refreshing the page
- Navigating home ↔ tool ↔ help
- Opening tools in the same browser profile

All pages read the same `toolkit-language` key on load.

---

## 3. Translation scope

### 3.1 Must translate

| Category | Examples |
|----------|----------|
| UI labels | Buttons, tabs, section headers, badges |
| Instructions | Setup steps, empty states, helper text |
| Feedback | Success/error toasts (if any), `alert()` / `confirm()` **message strings** |
| Form chrome | `placeholder`, `<label>`, validation messages |
| Accessibility | `aria-label`, `aria-describedby`, `title`, tooltip text |
| Navigation | Menu items, home link, help FAB, section counts (“7 tools”) |
| Help content | Guide titles, steps, FAQ (both locales maintained) |

### 3.2 Must NOT translate

| Category | Examples | Reason |
|----------|----------|--------|
| Student-facing English content | Vocabulary items, drill sentences, grammar examples | Learning material stays English |
| Grammar Checkpoint rules | Rule text, sentence bank, fix options | English practice |
| Story Forge output story | Composed story body shown to class | User/student content |
| Sentence Kitchen bins content | English sentences in bins | Activity content |
| WH Factory pasted lines | `Who: ...` student sentences | User input |
| User-entered names | Student names, class names, custom preset titles | User data |
| Stored JSON field names | `id`, `presets`, `students` | Schema stability |
| Internal enum keys | `ORDER_TYPES` keys, game state codes | Code/storage contract |

### 3.3 Gray area — rules

| Case | Rule |
|------|------|
| Tool **title** in menu vs. classroom display | **One official display name** per tool via `tool.<tool-id>.title` for menu, `<title>`, `<h1>`, and help guide title |
| Mixed legacy UI (Korean labels on English tool) | Replace with i18n keys; English becomes default display |
| `alert()` showing user data | Template only translated: `t('feedback.presetSaved', { name: preset.name })` — do not translate `name` |
| Date/number formatting | v1.0: keep existing formatting; locale-aware dates optional later |

### 3.4 Display vs. storage separation

**Required pattern:**

```javascript
// Storage: stable internal id
savedOrderType = 'statement_question'; // never '평서문+의문문'

// Display: i18n
labelEl.textContent = t('tool.sentence-kitchen.orderTypes.statement_question');
```

**Forbidden:**

```javascript
// BAD: persisting translated label
localStorage.setItem('orderType', t('tool.sentence-kitchen.orderTypes.statement_question'));
```

If legacy data already stores Korean display strings, migration maps them to internal IDs without deleting user data. **No automatic inference** — investigate structure at the tool’s phase and ship an explicit mapping table (see Sentence Kitchen in [toolkit-v1-spec.md §12](./toolkit-v1-spec.md#12-confirmed-policies-2026-07-29)).

---

## 4. Key naming convention

Keys use dot-separated paths. **Lowercase** segments; **kebab-case** for multi-word segments within a segment is allowed (`class-random-picker` as tool-id).

### 4.1 Top-level namespaces

| Prefix | Purpose | Examples |
|--------|---------|----------|
| `common.*` | Shared across all pages | `common.save`, `common.cancel`, `common.loading` |
| `navigation.*` | Menus, home, help, sections | `navigation.home`, `navigation.section.utils`, `navigation.tool.classroom-timer` |
| `settings.*` | Language toggle, global preferences | `settings.language`, `settings.language.en`, `settings.language.ko` |
| `feedback.*` | Generic messages, confirm templates | `feedback.confirmDelete`, `feedback.saved`, `feedback.clipboardCopied` |
| `tool.<tool-id>.*` | Tool-specific strings | `tool.ladder-game.title`, `tool.ladder-game.startRound` |

### 4.2 `tool.<tool-id>` structure

```
tool.<tool-id>.title              # Official name: menu, page title, h1, help guide title
tool.<tool-id>.description        # Subtitle / tagline (optional)
tool.<tool-id>.actions.<action>   # Buttons
tool.<tool-id>.labels.<field>      # Form labels
tool.<tool-id>.placeholders.<field>
tool.<tool-id>.aria.<element>
tool.<tool-id>.errors.<code>
tool.<tool-id>.confirm.<action>   # confirm() body
tool.<tool-id>.alert.<action>     # alert() body
tool.<tool-id>.help.<topic>        # In-app hints (not help center)
```

**tool-id** must match folder name from [toolkit-v1-spec.md §6](./toolkit-v1-spec.md#6-tool-registry) (e.g. `5w1h-factory`, `class-random-picker`). Numeric-prefixed ids such as `5w1h-factory` are **string tool-ids**; the runtime parser uses **bracket access** per dot segment (`messages['tool']['5w1h-factory']['title']`), not JavaScript dot identifiers.

### 4.3 Interpolation

Use `{name}` placeholders in JSON; runtime replaces from an params object.

```json
{
  "feedback": {
    "presetSaved": "Preset \"{name}\" saved."
  }
}
```

```javascript
t('feedback.presetSaved', { name: presetName });
```

Do not embed HTML in locale strings unless using a dedicated `_html` suffix key and a safe renderer (avoid in v1.0).

### 4.4 Reuse before duplicate

Prefer `common.save` over `tool.team-maker.save` unless the tool needs distinct wording. Document shared keys in `en.json` top sections.

---

## 5. File layout

```
shared/
  i18n-core.js   # Pure logic (locale resolve, t lookup, tests)
  i18n.js        # ES module: DOM, fetch, init/setLocale
  i18n.test.js   # Node test runner
  locales/
    en.json      # Source of truth; complete first
    ko.json      # Must mirror en.json keys; may lag briefly during dev
```

### 5.1 Locale file shape

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel"
  },
  "navigation": {
    "home": "Tool Kit",
    "section": {
      "utils": "Utilities",
      "study": "Study Tools",
      "activity": "Activities"
    }
  },
  "settings": {
    "language": "Language",
    "language.en": "English",
    "language.ko": "한국어"
  },
  "feedback": {},
  "tool": {
    "classroom-timer": {
      "title": "Classroom Timer"
    }
  }
}
```

Flat dot-keys in code (`navigation.section.utils`) resolve through nested JSON via the `t()` helper.

---

## 6. Runtime API (`shared/i18n.js`)

### 6.1 Public functions

| Function | Behavior |
|----------|----------|
| `initI18n(options?)` | Load messages for `en` + active locale; set `document.documentElement.lang`; optionally `applyToDOM()` |
| `getLocale()` | Returns `'en'` \| `'ko'` |
| `setLocale(locale)` | Validates locale, writes `toolkit-language`, updates `lang`, re-applies DOM, dispatches `toolkit:localechange` |
| `t(key, params?)` | Resolve key; fallback en → key string |
| `applyToDOM(root?)` | Scan `[data-i18n]`, `[data-i18n-placeholder]`, `[data-i18n-aria]`, `[data-i18n-title]` under `root` or `document` |

### 6.2 DOM binding conventions

| Attribute | Target |
|-----------|--------|
| `data-i18n="common.save"` | `textContent` |
| `data-i18n-placeholder="tool.x.placeholders.name"` | `placeholder` |
| `data-i18n-aria="tool.x.aria.start"` | `aria-label` |
| `data-i18n-title="tool.x.title"` | `title` attribute |

Dynamic content in JS:

```javascript
alert(t('tool.story-forge.alert.minWords'));
if (confirm(t('tool.story-forge.confirm.overwritePreset', { name }))) { ... }
```

### 6.3 Events

Custom event **`toolkit:localechange`** on `window` with `detail: { locale }` so tools re-render dynamic UI without full page reload.

### 6.4 Load strategy (static site)

Locale JSON URLs are resolved from **`import.meta.url` inside `shared/i18n.js`**:

```javascript
new URL('./locales/en.json', import.meta.url)
```

**Do not** hardcode deployment root paths (e.g. `/teacher-toolkit/shared/...`). Each page loads the module with:

```html
<script type="module">
  import { initI18n } from '../shared/i18n.js';
  initI18n();
</script>
```

`en.json` is always loaded; `ko.json` is loaded when active locale is `ko`. English messages are kept as the fallback cache.

---

## 7. Language toggle UI

### 7.1 Placement

- **Home:** Settings area or header — primary control.
- **Tool pages:** Reuse via `toolkit-home` bar extension or compact toggle next to “← Tool Kit”.
- **Help:** Same control for consistency.

### 7.2 Behavior

- Toggle or `<select>` between English / 한국어.
- Calls `setLocale('en' | 'ko')`.
- Does not reload page unless tool requires full re-init (prefer event-driven update).

---

## 8. Storage protection

| Rule | Detail |
|------|--------|
| New key | Only `toolkit-language` added for i18n |
| Existing keys | Untouched |
| `localStorage.clear()` | Prohibited |
| Migration | If tool must remap stored Korean labels → IDs, use versioned migration in that tool only |
| Scheduler | `makeup-scheduler/*` not edited; widget may still read `makeup-scheduler-schedules` |

---

## 9. Integration checklist (per page)

1. Add `<script src="../shared/i18n.js">` (adjust relative path) before tool scripts.
2. Load locale JSON or embed messages.
3. Call `initI18n()` on DOM ready.
4. Mark static strings with `data-i18n*` attributes.
5. Replace hardcoded `alert`/`confirm` strings with `t()`.
6. Subscribe to `toolkit:localechange` for dynamic regions.
7. Set `<title>` via JS: `document.title = t('tool.x.title') + ' · Tool Kit'` or similar pattern.
8. Verify `document.documentElement.lang` after init and toggle.

---

## 10. Pilot tool: `classroom-timer`

Recommended first adopter because:

- Single HTML file, moderate string count
- Already English UI — low content-boundary risk
- No localStorage — no migration risk
- Uses `toolkit-home.js` — validates shared header pattern

Pilot deliverables:

- Documented before/after pattern in PR description
- Complete `tool.classroom-timer.*` keys in en/ko
- Proof of language persistence into a second tool page

---

## 11. Help center i18n (confirmed)

**No bulk translation** of the entire help center in one pass.

Rollout order:

1. **Common help chrome** — language toggle, index headings, shared FAQ entries
2. **Beta four tools** — grammar-checkpoint, 5w1h-factory, story-forge, sentence-kitchen guides
3. **Per-tool** — add EN/KO guide content when that tool’s i18n phase lands

**Do not** translate the full historical update-notes archive. New release notes may be bilingual going forward.

Keys: `help.*` and/or `tool.<tool-id>.help.*`. `shared/help-updates-data.js` gains locale fields only for **new** entries as needed.

---

## 12. Testing

### 12.1 Automated (Phase 0)

Run from repo root:

```bash
npm test
```

Covers: `resolveInitialLocale`, legacy detection, bracket parser (`tool.5w1h-factory.title`), English fallback, interpolation.

### 12.2 Manual (per integration phase)

| Test | Expected |
|------|----------|
| New user (no keys) | `toolkit-language=en`, UI English, `lang=en` |
| Existing user (legacy key, no language key) | One-time `toolkit-language=ko` |
| Switch to KO | UI updates, `lang=ko`, storage updated |
| Refresh / cross-page | Language retained |
| Missing ko key | English shown |
| User preset with Korean name | Name unchanged when switching locale |
| Grammar sentence drill | Sentences stay English in both locales |
| Open alert then switch locale | Alert text unchanged (allowed edge case) |

---

## 13. Barrel Game

- `barrel-game/index.html` redirect stub — **no i18n**, unchanged.
- `barrel-game/tong-ajossi.html` — i18n applied in Phase 7 using `tool.barrel-game.*`.

## 14. Out of scope (v1.0)

- Replacing `alert`/`confirm` with custom modals (strings still i18n’d when shown)
- RTL or additional locales
- Translating English learning content
- Modifying `makeup-scheduler/` source or its i18n
- Auto browser language detection
- Wiring i18n into individual tools (Phase 1+)
