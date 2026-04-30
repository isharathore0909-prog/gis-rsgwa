import { useState, useEffect } from 'react';
import api from '../../../api';

export const useAquiferLoader = (filters) => {
    const [aquiferRecords, setAquiferRecords] = useState([]);
    const [aquiferLoading, setAquiferLoading] = useState(false);
    const [districtWaterLevelStats, setDistrictWaterLevelStats] = useState([]);

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        const fetchAquifer = async () => {
            if (!filters.district && filters.type === 'Aquifer') {
                setAquiferRecords([]);
                setAquiferLoading(false);
                return;
            }

            setAquiferLoading(true);
            const timeoutId = setTimeout(() => {
                if (!signal.aborted) setAquiferLoading(false);
            }, 15000);

            try {
                const params = {
                    district_id: filters.district_id,
                    district: filters.district,
                    block_id: filters.block_id,
                    block: filters.block,
                    gp_id: filters.gp_id,
                    grampanchayat: filters.gramPanchayat,
                    village_id: filters.village_id,
                    village_name: filters.village,
                    detailed: filters.district ? 'true' : 'false',
                    map_markers: !filters.district ? 'true' : undefined
                };
                const data = await api.aquifer.getRecords(params, signal);
                if (!signal.aborted) {
                    setAquiferRecords(data.results || data || []);
                    setAquiferLoading(false);
                }
            } catch (err) {
                if (err.name === 'AbortError' || err.name === 'CanceledError') return;
                if (!signal.aborted) {
                    setAquiferRecords([]);
                    setAquiferLoading(false);
                }
            } finally {
                clearTimeout(timeoutId);
            }
        };
        fetchAquifer();
        return () => controller.abort();
    }, [filters?.type, filters?.district, filters?.block, filters?.gramPanchayat, filters?.village]);

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        if (filters?.type !== 'Well Inventory' && filters?.type !== 'Aquifer') return;

        const fetchDistrictStats = async () => {
            try {
                const params = { level: 'district', year: filters.year || 2024 };
                const res = await api.aquifer.byLocation(params, signal);
                if (!signal.aborted && res.data) {
                    setDistrictWaterLevelStats(res.data.map(d => ({
                        name: d.district,
                        value: d.avg_pre || d.avg_pst || 0
                    })));
                }
            } catch (err) {
                if (err.name === 'AbortError' || err.name === 'CanceledError') return;
                console.error("Failed to fetch district water level stats:", err);
            }
        };

        fetchDistrictStats();
        return () => controller.abort();
    }, [filters?.type, filters?.year]);

    return { aquiferRecords, setAquiferRecords, aquiferLoading, setAquiferLoading, districtWaterLevelStats };
};
