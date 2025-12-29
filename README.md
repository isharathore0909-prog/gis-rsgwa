# Groundwater Analysis Portal - React Version

An interactive web-based groundwater analysis portal built with React, similar to India WRIS (Water Resources Information System). Features interactive maps, data visualization, and comprehensive groundwater monitoring capabilities.

## Features

- **Interactive Map**: Powered by React-Leaflet with multiple basemap options
- **Well Monitoring**: Visualize groundwater monitoring wells with color-coded markers based on water levels
- **Layer Controls**: Toggle between different data layers (wells, contours, quality zones)
- **Data Visualization**: Charts and tables for groundwater data analysis using Chart.js
- **Statistics Dashboard**: Real-time statistics and status indicators
- **Export Functionality**: Export data to CSV format
- **Responsive Design**: Works on desktop and mobile devices
- **Modern React**: Built with React 18, hooks, and functional components

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **React-Leaflet** - Map integration
- **Chart.js** - Data visualization
- **CSS3** - Styling

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

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

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` folder.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
GIS_RSGWA_ANALYSIS/
├── src/
│   ├── components/
│   │   ├── Header.jsx          # Header component with navigation
│   │   ├── Sidebar.jsx         # Sidebar with controls and statistics
│   │   ├── MapView.jsx         # Main map component
│   │   └── DataPanel.jsx        # Data analysis panel
│   ├── data/
│   │   └── groundwaterData.js  # Sample groundwater data
│   ├── App.jsx                 # Main app component
│   ├── main.jsx               # Entry point
│   └── index.css              # Global styles
├── index.html                  # HTML template
├── package.json                # Dependencies and scripts
├── vite.config.js             # Vite configuration
└── README.md                   # This file
```

## Customization

### Adding Your Own Data

Edit `src/data/groundwaterData.js` to include your own well locations and measurements:

```javascript
export const groundwaterData = [
    {
        id: 'GW001',
        lat: 28.6139,
        lng: 77.2090,
        waterLevel: 8.5,
        ph: 7.2,
        tds: 450,
        nitrate: 12,
        fluoride: 0.8,
        location: 'Your Location'
    },
    // Add more wells...
];
```

### Changing Map Center

Modify the `center` prop in `src/components/MapView.jsx`:

```javascript
<MapContainer
    center={[YOUR_LATITUDE, YOUR_LONGITUDE]}
    zoom={10}
    // ...
/>
```

### Styling

Each component has its own CSS file in the `components` folder. Modify these files to customize the appearance.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Browser Support

- ✅ Chrome (recommended)
- ✅ Firefox
- ✅ Edge
- ✅ Safari

## Development Notes

- The app uses React hooks for state management
- Map functionality is handled by React-Leaflet
- Charts are rendered using react-chartjs-2
- All components are functional components using hooks

## Future Enhancements

- Integration with real-time API data
- Advanced filtering and search capabilities
- 3D visualization
- Time-series analysis
- Report generation
- User authentication
- Database integration
- Redux for state management
- Unit and integration tests

## License

This project is open source and available for educational and research purposes.

## Acknowledgments

Inspired by the India WRIS Groundwater Portal (https://indiawris.gov.in/wris/#/groundWater)
