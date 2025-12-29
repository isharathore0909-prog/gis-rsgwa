# Setup Instructions

## PowerShell Execution Policy Issue

If you see an error about execution policies, you have two options:

### Option 1: Run in Command Prompt (CMD) instead of PowerShell

1. Open Command Prompt (not PowerShell)
2. Navigate to the project folder:
   ```cmd
   cd D:\GIS_RSGWA_ANALYSIS
   ```
3. Run:
   ```cmd
   npm install
   ```

### Option 2: Enable PowerShell Scripts (One-time setup)

Run PowerShell as Administrator and execute:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then try `npm install` again.

## Installation Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   The app will automatically open at `http://localhost:3000`

## What's Included

- ✅ React 18 with modern hooks
- ✅ Vite for fast development
- ✅ React-Leaflet for maps
- ✅ Chart.js for data visualization
- ✅ Component-based architecture
- ✅ Responsive design

## Project Structure

```
src/
├── components/        # React components
│   ├── Header.jsx
│   ├── Sidebar.jsx
│   ├── MapView.jsx
│   └── DataPanel.jsx
├── data/             # Data files
│   └── groundwaterData.js
├── App.jsx           # Main app component
├── main.jsx         # Entry point
└── index.css        # Global styles
```

## Need Help?

Check the main README.md for detailed documentation and troubleshooting.

