# 🔥 Hot Reload Guide

Since your keyboard mapping changed, here are several ways to get auto hot reload working:

## **Option 1: Auto-Restart Dev Server (Recommended)**
```bash
npm run dev:auto
```
- Automatically restarts the dev server when files change
- No keyboard shortcuts needed
- Works with any browser

## **Option 2: Browser Hot Reload**
```bash
npm run dev:hot
```
- Watches for file changes and refreshes browser automatically
- Works with Safari and Chrome on macOS
- Run this in a separate terminal while dev server is running

## **Option 3: Enhanced Vite Dev Server**
```bash
npm run dev
```
- Vite now has improved HMR (Hot Module Replacement)
- Better file watching with polling
- Should auto-reload in most cases

## **Option 4: Manual Refresh**
- Press `Cmd+R` (Safari) or `Ctrl+R` (Chrome) to refresh
- Or use `Cmd+Shift+R` for hard refresh

## **Timeline Sync Improvements**

The timeline now has better sync when it hits live:
- **Faster polling**: 300ms instead of 500ms
- **Auto-focus**: Map automatically focuses on new attacks when at live position
- **Smart positioning**: Stays at live position when new attacks arrive
- **Visual feedback**: 🔴 LIVE indicator when following live attacks

## **Usage**

1. **Start the dev server**: `npm run dev`
2. **Start hot reload** (optional): `npm run dev:hot` (in another terminal)
3. **Visit**: http://localhost:5173/app/map
4. **Watch**: Changes should auto-reload without keyboard shortcuts!

## **Troubleshooting**

If hot reload isn't working:
1. Try `npm run dev:auto` for full server restart
2. Check browser console for errors
3. Make sure you're using the dev server (not preview)
4. Try a hard refresh (`Cmd+Shift+R`)

The timeline should now sync much better when it hits live position! 🚀
