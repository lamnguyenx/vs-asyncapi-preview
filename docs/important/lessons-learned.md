# Lessons Learned – asyncapi-preview VS Code Extension

## Dark Theme for Webview Preview

### Problem

The rendered AsyncAPI preview was hardcoded to a white theme (`#fff` background, `#121212` text). VS Code dark theme users got a bright white panel clashing with their editor.

### Solution

Replaced inline `<style>` block in `src/PreviewWebPanel.ts` with a comprehensive dark theme using CSS custom properties and targeted override rules:

- **Body/background**: `#1e1e1e` (VS Code dark theme)
- **Text**: `#d4d4d4`
- **Sidebar**: `#000000` with hover state `#2a2d2e`
- **Cards/panels**: `#000000`
- **Code blocks**: `#2d2d2d` with `#ce9178` code text
- **Links**: `#569cd6` (VS Code link color)
- **Tables, borders**: `#404040`
- **Badges**: Muted versions of their light-theme counterparts (e.g. teal → `#0d5e6e`, orange → `#6b3a00`)

### Key Insight

The `@asyncapi/react-component` uses Tailwind utility classes scoped under `.aui-root`. Every bg/text/border Tailwind class used in the component's className strings must be overridden individually. The actual classes used (found by grepping the standalone bundle) are limited to:

| Background    | Text          | Border         |
|---------------|---------------|----------------|
| `bg-gray-100` | `text-gray-200` | `border-blue-300` |
| `bg-gray-200` | `text-gray-700` | `border-orange-300` |
| `bg-gray-400` | `text-gray-800` | `border-purple-300` |
| `bg-gray-600` | `text-blue-500` | `border-gray-300` |
| `bg-gray-800` | `text-teal-500` | `border` |
| `bg-blue-100` | `text-orange-500` | `border-solid` |
| `bg-blue-400` | `text-orange-600` | `border` |
| `bg-blue-500` | `text-orange-700` | `border-solid` |
| `bg-blue-600` | `text-white` | |
| `bg-green-600` | |
| `bg-orange-50` | |
| `bg-orange-600` | |
| `bg-red-600`  | |
| `bg-teal-500` | |
| `bg-yellow-600` | |
| `bg-white`    | |

Hover variants use the `\:` escape in CSS: `.hover\:bg-blue-300:hover` → `hover\\:bg-blue-300:hover` in template literals.

---

## Cmd+F (Find) Not Working in Webview

### Problem

Pressing Cmd+F in the preview panel didn't show a find widget. Text search was completely unavailable.

### Root Cause

VS Code 1.74+ requires the `enableFindWidget: true` option when creating a webview panel to enable the find widget. Without it, the find widget is never rendered in the webview, and Cmd+F silently falls through.

```typescript
vscode.window.createWebviewPanel('asyncapi-preview', '', vscode.ViewColumn.Two, {
  enableScripts: true,
  retainContextWhenHidden: true,
  enableFindWidget: true,  // ← this was missing
  localResourceRoots,
});
```

### Supporting Fixes

- **`panel.reveal()`**: Called after setting `panel.webview.html` to ensure the webview panel gains focus after content reload. Also called in a `ready` message handler so focus is re-established after the iframe finishes loading.

- **`window.focus()`**: Called inside the webview's `load` event with a 1s delay to ensure the iframe window itself has keyboard focus, so Cmd+F routes to the webview find widget.

- **`ready` message**: The webview sends `vscode.postMessage({ type: 'ready' })` on load. The extension listens and calls `panel.reveal()` again. This covers the case where the editor steals focus back during the async render.

### Lesson

Always set `enableFindWidget: true` when creating webview panels in VS Code extensions targeting >=1.74. The default is technically `true` but may not behave consistently across platforms. Explicit is safer.

---

## Preview Opening in Same Editor Group

### Problem

The preview opened in `ViewColumn.Two`, splitting the editor and pushing content around.

### Solution

Changed to `ViewColumn.Active`, which opens the preview as a tab in the currently active editor group — same behavior as Markdown or Mermaid previews.

```typescript
vscode.window.createWebviewPanel('asyncapi-preview', '', vscode.ViewColumn.Active, { ... });
```

---

## Webview Panel Lifecycle Summary

| Option | Purpose |
|--------|---------|
| `enableScripts: true` | Required for JavaScript in webview |
| `retainContextWhenHidden: true` | Preserves state when switching tabs; critical for scroll position and render cache |
| `enableFindWidget: true` | Enables Cmd+F / Ctrl+F find widget (VS Code 1.74+) |
| `localResourceRoots` | Grants access to local files (CSS/JS from dist, workspace roots) |

## Build & Install Quick Reference

```bash
# Build production bundle
npm run package

# Symlink into VS Code extensions (for dev)
EXT_DIR=~/.vscode/extensions/asyncapi.asyncapi-preview-1.1.1
rm -rf "$EXT_DIR"
ln -s $(pwd) "$EXT_DIR"

# Then reload VS Code: Cmd+Shift+P → "Developer: Reload Window"
```
