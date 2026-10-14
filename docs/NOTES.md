# Majeek Notes — Technical Notes

> Per-app context for future sessions. Keeps deep detail out of the shared memory file.
> Cross-app context lives in `Majeek apps/docs/` (RESUME, PROGRESS, ROADMAP, CONVENTIONS).

**Repo:** `github.com/Majeekmedia/notes-app` · **Branch:** `main`
**Last updated:** 2026-10-14

---

## Quick facts

| Thing | Value |
|---|---|
| Expo SDK | 57 (React Native 0.86, React 19.2) |
| Router | Expo Router, file-based, **`src/app/`** (not `app/`) |
| Path alias | `@/*` → `./src/*` |
| Storage | AsyncStorage, key **`notes-app/notes/v1`** |
| Package / bundle id | `com.majeek.notes` |
| Deep-link scheme | `majeeknotes` |
| Dev server | `npx expo start` (port 8081) |

---

## File map

```
src/
├── app/                        # every file here is a route
│   ├── _layout.tsx             # SafeAreaProvider → ThemeProvider → NotesProvider → Stack
│   ├── index.tsx               # list: search, tag filter, sort, bulk select, FAB, actions sheet
│   ├── tags.tsx                # tag management: rename / delete a tag everywhere
│   └── note/[id].tsx           # editor: title, body, TagEditor, pin, delete
├── components/
│   ├── note-row.tsx            # row + sibling rail (pin button OR selection checkbox)
│   ├── note-actions-sheet.tsx  # long-press Modal: pin + delete + cancel
│   ├── tag-editor.tsx          # chip editor with autocomplete
│   ├── search-bar.tsx
│   ├── tag-chip.tsx            # label overridable (filter vs add)
│   ├── themed-text.tsx         # from the Expo template — keep
│   └── themed-view.tsx         # from the Expo template — keep
├── constants/
│   ├── theme.ts                # colour palette, spacing, fonts
│   └── navigation-theme.ts     # nav theme mapped onto our palette (prevents flashing)
├── hooks/
│   ├── use-notes.tsx           # single source of truth + all mutations (incl. bulk)
│   ├── use-theme.ts
│   └── use-color-scheme.ts
├── lib/
│   ├── storage.ts              # AsyncStorage read/write + one-time shape upgrade
│   ├── notes-query.ts          # search / tag filter / sort / tag suggestions (pure)
│   ├── format.ts               # relative dates
│   └── confirm.ts              # Alert (native) / window.confirm (web)
└── types/
    └── note.ts                 # Note type, factories, tag parsing, normalizeNote
scripts/
└── capture-screenshots.js      # headless-Chrome README screenshots
docs/
├── NOTES.md                    # this file
└── screenshots/                # 7 PNGs referenced by the README
```

---

## Key decisions (and why)

**AsyncStorage, not MMKV.** MMKV is a native module and is **not bundled in Expo Go**, so using it
would force a custom development build and break the free QR-code workflow. AsyncStorage is
`inExpoGo: true`. For a notes app the performance difference is irrelevant.

**No storage-key bump for `tags` / `pinned`.** Both were added *after* v1 shipped. Bumping the key
would have made every existing note vanish. Instead `normalizeNote()` back-fills defaults on read,
and `loadNotes()` writes the upgraded shape back once. **Verified** by seeding a legacy-shaped note:
it gained `tags: []` and `pinned: false` and kept its title and body.

**Pinning does not touch `updatedAt`.** Pinning is not an edit. Bumping the timestamp would make a
pinned note claim it was "just edited" and reorder the list unexpectedly.

**State lives above the navigator.** `NotesProvider` wraps the `Stack`, because the list and the
editor mutate the same collection and the editor is a pushed route.

**Editor owns a local draft.** Reading from context on every keystroke would fight the local state,
so initial values are captured once. Saves are debounced 400 ms and flushed on unmount.

**Interactive elements are siblings, never nested.** Putting the pin button inside the tappable row
rendered `<button>` inside `<button>` on web — invalid HTML, broken hydration, two focus targets for
screen readers. The row and its pin rail are siblings; the rail uses `pointerEvents="box-none"`.

**The actions menu is a `Modal`, not an `Alert`.** `Alert` does not exist on react-native-web, and
web's `confirm()` only offers two buttons — it could never host Pin + Delete + Cancel.

---

## Gotchas hit while building this (don't repeat)

| Symptom | Cause | Fix |
|---|---|---|
| `Unknown child element passed to Stack:` | A JSX comment `{/* */}` inside `<Stack>` evaluates to `undefined` | Remove comments from inside `<Stack>` |
| Screen stuck on a spinner | Stale bundle / HMR state | Kill server, `rm -rf .expo/types`, `npx expo start --clear` |
| `Argument of type '/note/${string}' is not assignable` | Typed routes need the **object form** for dynamic routes | `router.push({ pathname: '/note/[id]', params: { id } })` |
| `Remove-Item "[id].tsx"` silently does nothing | PowerShell treats `[ ]` as wildcard character classes | `Remove-Item -LiteralPath "[id].tsx"` |
| Flash on every push/pop | Navigator painted its own background, differing from the screen | See `constants/navigation-theme.ts` + `SystemUI.setBackgroundColorAsync` |
| `onDelete is not defined` / `PIN_RAIL_WIDTH is not defined` **after the file is already fixed** | Stale hot-reload error from an intermediate save | Trust `npx tsc --noEmit`, restart with `--clear` |

---

## Verification approach

Claims in `PROGRESS.md` were backed by:

- `npx tsc --noEmit` → exit 0
- Real interaction in a browser: scripted clicks, `page.mouse.down/up` for long-press
- Storage assertions read back from `localStorage`
- A **legacy-shaped note** seeded to prove the migration
- Search for a term that appears **only as a tag** to prove tags are searched
- `document.querySelectorAll('button button').length === 0` to prove no nested buttons
- Screenshot ink-coverage percentages to prove each image shows its intended screen
- Dark-mode edge luma of 0 to prove captures are full-bleed

---

## Known limitations

- Search is a plain substring match — no fuzzy matching or ranking
- Bulk actions pin/tag/delete only; they cannot merge notes
- Tags have no colours or ordering
- No rich text formatting
- Storage is unencrypted (SecureStore would be needed for secrets)
- No cross-device sync (that starts at App #4, Majeek Habits, with Supabase)

---

## If you change the UI

Regenerate the screenshots — they are referenced by the README:

```powershell
Set-Location "C:\Users\HP\Desktop\Majeek apps\apps\notes-app"
npx expo start            # in one terminal
node scripts/capture-screenshots.js   # in another
```

The script drives the app (types in search, performs a real long-press) and **asserts the layout is
exactly 390×844 before every capture**, so a shifted viewport fails loudly instead of producing a
bad image.
