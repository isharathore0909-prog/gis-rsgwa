export const handleExportData = async (data, filters) => {
    if (!data || !data.features || data.features.length === 0) {
        alert("No data available to export.");
        return;
    }

    const tableSelection = []; // This needs to be passed in if we want to filter by selection
    // But usually handleExportData in App.jsx takes tableSelection from state.
    // I will refactor it to accept tableSelection as an argument.
};

export const exportToCSV = async (featuresToExport, filename) => {
    if (featuresToExport.length === 0) {
        alert("No data matching selection to export.");
        return;
    }

    // Check if this is Well Inventory data
    const isWellInventory = featuresToExport.length > 0 &&
        (featuresToExport[0].properties['Category'] === 'Well Inventory (Detailed)' ||
            featuresToExport[0].properties['Category'] === 'Ground Water Level');

    let rows = featuresToExport;
    let headers = [];

    if (isWellInventory) {
        // Transform to long format: S.No., Well ID, Lat, Lon, Village, Aquifer, Year, Pre-Mons, Post-Monsoon (m bgl)
        headers = ['S.No.', 'Well ID', 'Lat', 'Lon', 'Village', 'Aquifer', 'Year', 'Pre-Monsoon', 'Post-Monsoon (m bgl)'];
        rows = [];
        featuresToExport.forEach((feature, index) => {
            const p = feature.properties;
            const lat = feature.geometry?.coordinates[1] || p.lat || '';
            const lon = feature.geometry?.coordinates[0] || p.lng || '';
            const wellId = p['Well ID'] || p.well_id || '-';
            const village = p['Village'] || p.village || '-';
            const aquifer = p['Aquifer'] || p.aquifer || '-';
            const sno = index + 1;

            for (let year = 2015; year <= 2024; year++) {
                const row = {
                    'S.No.': sno,
                    'Well ID': wellId,
                    'Lat': lat,
                    'Lon': lon,
                    'Village': village,
                    'Aquifer': aquifer,
                    'Year': year,
                    'Pre-Monsoon': p[`Pre ${year}`] || '-',
                    'Post-Monsoon (m bgl)': p[`Post ${year}`] || '-'
                };
                rows.push({ properties: row });
            }
        });
    } else {
        // Generic Header Collection
        const allHeaderSet = new Set();
        featuresToExport.forEach(f => {
            Object.keys(f.properties).forEach(key => allHeaderSet.add(key));
        });
        headers = Array.from(allHeaderSet);
    }

    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const feature of rows) {
        const values = headers.map(header => {
            const val = feature.properties[header];
            // Handle null/undefined and escape quotes
            const escaped = (val === null || val === undefined ? '' : '' + val).replace(/"/g, '""');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }

    const csvString = csvRows.join('\n');

    // Try using Native Save File Picker first
    if ('showSaveFilePicker' in window) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: filename,
                types: [{
                    description: 'CSV File',
                    accept: { 'text/csv': ['.csv'] },
                }],
            });
            const writable = await handle.createWritable();
            await writable.write(csvString);
            await writable.close();
            return;
        } catch (err) {
            if (err.name === 'AbortError') return; // User cancelled
            console.warn("File System Access API failed, falling back to silent download:", err);
        }
    }

    // Fallback to legacy silent download
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
