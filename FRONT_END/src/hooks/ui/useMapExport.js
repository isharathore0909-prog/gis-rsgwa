import { useState, useEffect } from 'react';
import { BACKEND_API, getBackendHeaders } from '../../api/config';

export const useMapExport = (map, filters, exportTrigger) => {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async (type) => {
        if (!map) return;
        let bbox;
        if (type === 'current') {
            const bounds = map.getBounds();
            bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
        } else {
            bbox = [69.3, 23.0, 78.3, 30.6];
        }

        const selectedLayers = [];
        if (filters?.type === 'Water Resources') {
            if (filters?.showCanals) selectedLayers.push('canals');
            if (filters?.showWaterbodies) selectedLayers.push('waterbodies');
            if (filters?.showMicro) selectedLayers.push('micro');
            if (filters?.showDams) selectedLayers.push('dams');
        } else if (filters?.type === 'Rainfall') {
            selectedLayers.push('rainfall');
        } else if (filters?.type === 'Well Inventory' || filters?.type === 'Aquifer') {
            selectedLayers.push('aquifer');
        } else if (filters?.type === 'Ground Water Resource Estimation') {
            selectedLayers.push('groundwater_zones');
        } else if (filters?.type === 'Water Quality') {
            selectedLayers.push('water_quality');
        }

        // Include relevant boundary layers
        if (filters?.village) selectedLayers.push('village');
        if (filters?.gramPanchayat || filters?.grampanchayat) selectedLayers.push('grampanchayat');
        if (filters?.block) selectedLayers.push('block');
        if (filters?.district) {
            if (!selectedLayers.includes('district')) selectedLayers.push('district');
        } else {
            selectedLayers.push('state');
            selectedLayers.push('district'); // Include district outlines for state view
        }

        const payload = {
            bbox,
            layers: selectedLayers,
            location_name: filters?.village || filters?.gramPanchayat || filters?.block || filters?.district || "Rajasthan_Map",
            format: "pdf",
            filters: {
                type: filters?.type,
                district: filters?.district,
                block: filters?.block,
                gramPanchayat: filters?.gramPanchayat,
                village: filters?.village,
                dataRangeStart: filters?.dataRangeStart,
                dataRangeEnd: filters?.dataRangeEnd,
                showEC: filters?.showEC,
                showNitrate: filters?.showNitrate,
                showFluoride: filters?.showFluoride,
                showTDS: filters?.showTDS
            }
        };

        try {
            setIsExporting(true);
            const exportUrl = `${BACKEND_API.BASE_URL.endsWith('/') ? BACKEND_API.BASE_URL.slice(0, -1) : BACKEND_API.BASE_URL}/export/map/`;
            const response = await fetch(exportUrl, {
                method: "POST",
                headers: getBackendHeaders(true),
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error("Export failed");

            const result = await response.json();
            if (result.url) {
                window.open(result.url, '_blank');
            } else {
                throw new Error("No download URL received from server");
            }
        } catch (err) {
            console.error("Export failed:", err);
            alert("Map export failed. Please try again.");
        } finally {
            setIsExporting(false);
        }
    };

    useEffect(() => {
        if (exportTrigger) handleExport('state');
    }, [exportTrigger]);

    return { handleExport, isExporting };
};
