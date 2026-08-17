import { useState, useEffect } from 'react';
import api from '../../../api';

export const useWellRainfall = ({ isActive, displayRegion, displayBlock, globalFilters, selectedWell, rainfallStations }) => {
    const [rainfallData, setRainfallData] = useState({});
    const [rainfallLoading, setRainfallLoading] = useState(false);
    const [overallAverage, setOverallAverage] = useState(null);

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        if (!isActive) {
            setRainfallData({});
            setOverallAverage(null);
            setRainfallLoading(false);
            return () => controller.abort();
        }

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
                    response = await api.rainfall.getStationSummary(params, signal);

                    // Fallback Attempt
                    if (selectedWell && (!response || (!Array.isArray(response) && !response.data) || (Array.isArray(response) && response.length === 0))) {
                        if (signal.aborted) return;
                        const fallbackParams = {
                            timestep: params.timestep,
                            start_date: params.start_date,
                            end_date: params.end_date,
                            block: params.block,
                            district: params.district
                        };
                        response = await api.rainfall.getStationSummary(fallbackParams, signal);
                    }

                    // Secondary fallback to standard rainfall records if stations are empty
                    if (!response || (!Array.isArray(response) && !response.data) || (Array.isArray(response) && response.length === 0)) {
                        if (signal.aborted) return;
                        const genParams = { ...params };
                        if (globalFilters?.gramPanchayat) genParams.gram_panchayat = globalFilters.gramPanchayat;
                        response = await api.rainfall.getSummary(genParams, signal);
                    }
                } catch (err) {
                    if (err.name === 'AbortError' || err.name === 'CanceledError' || err.message === 'canceled') return;
                    console.error("Rainfall fetch failed", err);
                    response = [];
                }

                if (!signal.aborted && (Array.isArray(response) || (response && response.data))) {
                    const rainMap = {};
                    const records = Array.isArray(response) ? response : (response.data || []);
                    const avg = response?.overall_average || null;

                    records.forEach(r => {
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
                    setOverallAverage(avg);
                } else if (!signal.aborted) {
                    setRainfallData({});
                    setOverallAverage(null);
                }
            } catch (err) {
                if (err.name === 'AbortError' || err.name === 'CanceledError' || err.message === 'canceled') return;
                if (!signal.aborted) console.error("Error fetching rainfall for well inventory:", err);
            } finally {
                if (!signal.aborted) setRainfallLoading(false);
            }
        };

        fetchRainfall();
        return () => controller.abort();
    }, [
        isActive,
        selectedWell,
        displayRegion,
        displayBlock,
        globalFilters?.village,
        globalFilters?.gramPanchayat
    ]);

    return { rainfallData, rainfallLoading, overallAverage };
};
