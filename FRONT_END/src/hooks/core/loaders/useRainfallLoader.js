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

    const lastFetchedDistrict = useRef(null);

    useEffect(() => {
        let ignore = false;

        const fetchStationRainfall = async () => {
            const shouldLoad = rainfallStations.length === 0;
            if (shouldLoad) setRainfallLoading(true);

            try {
                const params = { limit: 10000 };
                if (filters?.district) {
                    if (lastFetchedDistrict.current === filters.district) {
                        if (!ignore && shouldLoad) setRainfallLoading(false);
                        return;
                    }
                    params.district = toTitleCase(filters.district);
                    lastFetchedDistrict.current = filters.district;
                }

                const [stations, records] = await Promise.all([
                    api.rainfall.getStations(params),
                    api.rainfall.getStationRecords(params)
                ]);
                if (!ignore) {
                    setRainfallStations(Array.isArray(stations) ? stations : []);
                    setRainfallStationRecords(Array.isArray(records?.results) ? records.results : (Array.isArray(records) ? records : []));
                }
            } catch (err) {
                if (!ignore) {
                    setRainfallStations([]);
                    setRainfallStationRecords([]);
                }
            } finally {
                if (!ignore && shouldLoad) setRainfallLoading(false);
            }
        };

        const safetyTimeout = setTimeout(() => {
            if (!ignore) setRainfallLoading(false);
        }, 15000);

        fetchStationRainfall();
        return () => {
            ignore = true;
            clearTimeout(safetyTimeout);
        };
    }, [filters?.type, filters?.district]);

    return {
        rainfallPoints, setRainfallPoints,
        rainfallDataSource, setRainfallDataSource,
        rainfallStations, setRainfallStations,
        rainfallStationRecords, setRainfallStationRecords,
        rainfallLoading, setRainfallLoading
    };
};
