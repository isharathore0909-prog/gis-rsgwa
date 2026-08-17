import { useState, useEffect, useRef } from 'react';
import api from '../../../api';

const toTitleCase = (str) => {
    if (!str) return str;
    return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

export const useRainfallLoader = (filters) => {
    const [rainfallPoints, setRainfallPoints] = useState([]);
    const [rainfallDataSource, setRainfallDataSource] = useState('station');
    const [rainfallStations, setRainfallStations] = useState([]);
    const [rainfallStationRecords, setRainfallStationRecords] = useState([]);
    const [rainfallLoading, setRainfallLoading] = useState(false);

    const lastParamsRef = useRef('');

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        if (filters?.type !== 'Rainfall') {
            setRainfallLoading(false);
            return () => controller.abort();
        }

        const fetchStationRainfall = async () => {
            const params = {
                limit: 10000,
                district: filters.district ? toTitleCase(filters.district) : undefined,
                district_id: filters.district_id
            };

            // Skip if parameters haven't changed
            const paramsKey = JSON.stringify(params);
            if (paramsKey === lastParamsRef.current) return;
            lastParamsRef.current = paramsKey;

            const shouldLoad = rainfallStations.length === 0;
            if (shouldLoad) setRainfallLoading(true);

            try {
                const [stations, records] = await Promise.all([
                    api.rainfall.getStations(params, signal),
                    api.rainfall.getStationRecords(params, signal)
                ]);
                if (!signal.aborted) {
                    setRainfallStations(Array.isArray(stations) ? stations : []);
                    setRainfallStationRecords(Array.isArray(records?.results) ? records.results : (Array.isArray(records) ? records : []));
                }
            } catch (err) {
                if (err.name === 'AbortError' || err.name === 'CanceledError' || err.message === 'canceled') return;
                if (!signal.aborted) {
                    setRainfallStations([]);
                    setRainfallStationRecords([]);
                }
            } finally {
                if (!signal.aborted && shouldLoad) setRainfallLoading(false);
            }
        };

        const safetyTimeout = setTimeout(() => {
            if (!signal.aborted) setRainfallLoading(false);
        }, 15000);

        fetchStationRainfall();
        return () => {
            controller.abort();
            clearTimeout(safetyTimeout);
        };
    }, [filters?.type, filters?.district, filters?.district_id]);

    return {
        rainfallPoints, setRainfallPoints,
        rainfallDataSource, setRainfallDataSource,
        rainfallStations, setRainfallStations,
        rainfallStationRecords, setRainfallStationRecords,
        rainfallLoading, setRainfallLoading
    };
};
