# Notes App

A minimal, offline-first notes app built with **Expo SDK 57 + Expo Router + TypeScript**.

Built as **portfolio app #1** in a deliberate progression from simple to complex. The goal of this
app is to demonstrate navigation, forms, list rendering, and local persistence — not to compete with
a full note-taking product.

<p align="center">
  <em>Screenshots coming once captured on a physical device.</em>
</p>

---

## Features

- **Create, edit, and delete notes** — full CRUD
- **Two-screen flow** (list → editor) using Expo Router's file-based navigation
- **Autosave** — debounced writes (400 ms) plus a flush on screen exit, so nothing is lost
- **Persistent storage** via AsyncStorage — notes survive a full app restart
- **Light / dark mode** — follows the system setting
- **Delete confirmation** — works on both native and web
- **Accessible** — labelled buttons and list rows for screen readers
- **Empty state** — a clear call to action when there are no notes

---

## Tech stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | Expo SDK 57 | React Native 0.86, React 19.2 |
| Navigation | Expo Router | File-based, typed routes |
| Language | TypeScript | `strict` mode, no `any` |
| Storage | AsyncStorage | Bundled in Expo Go — no custom build needed |
| State | React Context + `useRef` | No state library needed at this size |
| Theming | `useColorScheme` + theme constants | Inherited from the Expo template |

### Why AsyncStorage and not MMKV

MMKV is faster but requires native code, which means **Expo Go can't run it** — the app would need a
custom development build. AsyncStorage is bundled inside Expo Go, keeping the free QR-code workflow
intact. For a notes app of this size the performance difference is irrelevant.

---

## Project structure

```
src/
├── app/                      # Expo Router — every file here is a screen
│   ├── _layout.tsx           # Stack navigator + providers
│   ├── index.tsx             # Notes list
│   └── note/
│       └── [id].tsx          # Note editor (dynamic route)
├── components/
│   ├── note-row.tsx          # A single row in the list
│   ├── themed-text.tsx       # (template) text with theme colours
│   └── themed-view.tsx       # (template) view with theme colours
├── constants/theme.ts        # Colour palette, spacing, fonts
├── hooks/
│   ├── use-notes.tsx         # Notes state + all mutations
│   ├── use-theme.ts          # Resolves the active colour set
│   └── use-color-scheme.ts   # System colour scheme
├── lib/
│   ├── storage.ts            # AsyncStorage read/write
│   ├── format.ts             # Relative date formatting
│   └── confirm.ts            # Cross-platform confirm dialog
└── types/
    └── note.ts               # Note type, factories, guards
```

### Architecture notes

- **State lives above the navigator.** Both screens mutate the same collection, so `NotesProvider`
  wraps the `Stack` in `_layout.tsx`. This keeps the list and editor in sync without prop drilling.
- **The editor owns a local draft.** Reading the note from context on every keystroke would fight the
  local state, so initial values are captured once and the draft is local from then on.
- **Saves are debounced but flushed on exit.** A 400 ms debounce avoids hammering AsyncStorage while
  typing; an unmount effect guarantees pending edits are written before leaving.
- **Stored data is validated on read.** `isNote()` filters out anything that doesn't match the shape,
  so a corrupted or hand-edited cache can't crash the list.

---

## Getting started

### Prerequisites

- **Node.js ≥ 22.13** (required by Expo SDK 57)
- **Expo Go** on a physical device, or an Android emulator / web browser

### Run it

```bash
npm install
npx expo start
```

Then either:

- **Scan the QR code** with Expo Go (phone must be on the same Wi-Fi network)
- Press **`w`** for the browser
- Press **`a`** for an Android emulator

### Useful commands

```bash
npx tsc --noEmit    # type check
npx expo lint       # lint
npx expo-doctor     # diagnose dependency/config issues
```

---

## What I learned building this

- **Expo Router** maps files to routes the same way Next.js App Router does — `src/app/note/[id].tsx`
  becomes `/note/:id`. Typed routes mean a bad `router.push()` is a compile error.
- **Expo Go only bundles a fixed set of native modules.** Choosing a library with native code forces a
  development build and breaks the free QR workflow. Checking `inExpoGo` in the Expo docs first saved
  a rewrite here.
- **Debounced autosave needs an explicit flush.** Relying on the debounce alone loses the final
  keystrokes if the user leaves immediately.
- **`Alert` doesn't exist on react-native-web.** Platform-specific fallbacks are needed for anything
  that isn't pure UI.

## Known limitations

- No search or filtering
- No tags, categories, or pinning
- No rich text formatting
- Storage is unencrypted (fine for non-sensitive notes; SecureStore would be needed otherwise)
- No sync across devices

## Possible next steps

- Search and filter
- Tags and pinning
- Move to `expo-sqlite` if the note count grows large
- Optional Supabase sync for multi-device support

---

## License

MIT
