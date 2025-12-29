# Quick Start Guide

## React Version (Current)

The application has been converted to React! Follow these steps:

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The app will automatically open at `http://localhost:3000`

### 3. Build for Production

```bash
npm run build
```

## Old Version (Deprecated)

The old vanilla JavaScript version files (`app.js`, `styles.css`, `server.py`) are still in the root directory but are deprecated. The React version is the current implementation.

## Troubleshooting

### Port Already in Use

If port 3000 is already in use, Vite will automatically use the next available port. Check the terminal output for the actual URL.

### Node Modules Issues

If you encounter issues, try:

```bash
rm -rf node_modules
npm install
```

### Map Not Loading

- Make sure you have an internet connection (map tiles load from CDN)
- Check browser console (F12) for errors
- Try clearing browser cache

## Features

✅ Interactive map with React-Leaflet
✅ Component-based architecture
✅ State management with React hooks
✅ Data visualization with Chart.js
✅ Responsive design
✅ Export functionality

