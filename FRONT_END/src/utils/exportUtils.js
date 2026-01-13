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

    // Collect all unique headers across all features to export
    const allHeaderSet = new Set();
    featuresToExport.forEach(f => {
        Object.keys(f.properties).forEach(key => allHeaderSet.add(key));
    });
    const headers = Array.from(allHeaderSet);

    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const feature of featuresToExport) {
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
