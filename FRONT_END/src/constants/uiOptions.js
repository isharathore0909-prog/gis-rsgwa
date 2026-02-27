export const SOURCES = ['Rajasthan GW'];

export const DISTRICTS = [
    'Ajmer', 'Alwar', 'Banswara', 'Baran', 'Barmer', 'Bharatpur', 'Bhilwara',
    'Bikaner', 'Bundi', 'Chittorgarh', 'Churu', 'Dausa', 'Dholpur', 'Dungarpur',
    'Ganganagar (Sri Ganganagar)', 'Hanumangarh', 'Jaipur', 'Jaisalmer',
    'Jalore', 'Jhalawar', 'Jhunjhunu', 'Jodhpur', 'Karauli', 'Kota', 'Nagaur',
    'Pali', 'Pratapgarh', 'Rajsamand', 'Sawai Madhopur', 'Sikar', 'Sirohi',
    'Tonk', 'Udaipur'
];

export const TIMESTEPS = ['All', 'Daily', 'Monthly', 'Quarterly', 'Yearly', 'Seasonal'];

export const STATION_TYPES = ['All', 'Manual', 'Telemetry'];

export const TYPE_OPTIONS = [
    'Aquifer',
    'Ground Water Resource Estimation', // Matches GW Assessment
    'Rainfall',
    'Recharge Structure',
    'Water Quality',
    'Water Resources',
    'Well Inventory',
];

export const BASEMAPS = [
    {
        id: 'light-gray',
        name: 'Light Gray Canvas',
        thumbnail: 'https://js.arcgis.com/4.29/esri/images/basemap/gray.jpg'
    },
    {
        id: 'imagery-labels',
        name: 'Imagery with Labels',
        thumbnail: 'https://js.arcgis.com/4.29/esri/images/basemap/hybrid.jpg'
    },
    {
        id: 'streets',
        name: 'Streets',
        thumbnail: 'https://js.arcgis.com/4.29/esri/images/basemap/streets.jpg'
    },
    {
        id: 'imagery',
        name: 'Imagery',
        thumbnail: 'https://js.arcgis.com/4.29/esri/images/basemap/satellite.jpg'
    },
    {
        id: 'osm',
        name: 'OpenStreetMap',
        thumbnail: 'https://a.tile.openstreetmap.org/0/0/0.png'
    }
];
