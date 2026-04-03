import { useState, useEffect } from 'react';
import api from '../../../api';

export const useWellRainfall = ({ displayRegion, displayBlock, globalFilters, selectedWell, rainfallStations }) => {
    const [rainfallData, setRainfallData] = useState({});
    const [rainfallLoading, setRainfallLoading] = useState(false);

    useEffect(() => {
        let ignore = false;
        const fetchRainfall = async () => {
            setRainfallLoading(true);
            try {
                const params = {
                    timestep: 'yearly',
                    start_date: '2015-01-01',
                    end_date: '2024-12-31'
                };

                const toTitleCase = (str) => {
                    if (!str || typeof str !== 'string') return str;
                    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                };

                if (selectedWell) {
                    params.village = selectedWell.village_name || selectedWell.village || selectedWell.properties?.village_name;
                    params.block = selectedWell.block;
                    params.district = selectedWell.district;
                } else {
                    if (globalFilters?.village) params.village = globalFilters.village;
                    if (globalFilters?.gramPanchayat) params.gram_panchayat = globalFilters.gramPanchayat;
                    if (displayBlock) params.block = toTitleCase(displayBlock);
                    if (displayRegion && displayRegion !== 'Rajasthan') params.district = toTitleCase(displayRegion);
                }

                let response = [];
                try {
                    // Attempt 1: Specific Village/Block/District fetch
                    response = await api.rainfall.getStationSummary(params);

                    // Fallback Attempt: If no data for specific village/station context, 
                    // try a broader Block/District fetch to get regional average.
                    if (selectedWell && (!response || !Array.isArray(response) || response.length === 0)) {
                        const fallbackParams = {
                            timestep: params.timestep,
                            start_date: params.start_date,
                            end_date: params.end_date,
                            block: params.block,
                            district: params.district
                        };
                        response = await api.rainfall.getStationSummary(fallbackParams);
                    }

                    // Secondary fallback to standard rainfall records if stations are empty
                    if (!response || !Array.isArray(response) || response.length === 0) {
                        const genParams = { ...params };
                        if (globalFilters?.gramPanchayat) genParams.gram_panchayat = globalFilters.gramPanchayat;
                        response = await api.rainfall.getSummary(genParams);
                    }
                } catch (err) {
                    console.error("Rainfall fetch failed", err);
                    response = [];
                }

                if (!ignore && Array.isArray(response)) {
                    const rainMap = {};
                    response.forEach(r => {
                        let yrVal = r.year || r.name || r.date;
                        let finalYear = null;

                        if (yrVal) {
                            if (yrVal instanceof Date) finalYear = yrVal.getFullYear().toString();
                            else if (typeof yrVal === 'string') {
                                if (yrVal.includes('-')) finalYear = new Date(yrVal).getFullYear().toString();
                                else finalYear = yrVal;
                            } else if (typeof yrVal === 'number') finalYear = yrVal.toString();
                        }

                        if (finalYear && finalYear.length === 4) {
                            rainMap[finalYear] = r.average || r.total || 0;
                        }
                    });
                    setRainfallData(rainMap);
                } else if (!ignore) {
                    setRainfallData({});
                }
            } catch (err) {
                if (!ignore) console.error("Error fetching rainfall for well inventory:", err);
            } finally {
                if (!ignore) setRainfallLoading(false);
            }
        };

        fetchRainfall();
        return () => { ignore = true; };
    }, [selectedWell, displayRegion, displayBlock, globalFilters, rainfallStations]);

    return { rainfallData, rainfallLoading };
};
