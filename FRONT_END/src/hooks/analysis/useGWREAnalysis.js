import { useState, useMemo, useEffect } from 'react';
import api from '../../api';

export const useGWREAnalysis = ({
    isGWRE,
    globalFilters,
    displayRegion,
    displayBlock
}) => {
    const [gwreStats, setGwreStats] = useState(null);
    const [gwreLoading, setGwreLoading] = useState(false);

    useEffect(() => {
        let ignore = false;
        const isGwreType = isGWRE || globalFilters?.type === 'Ground Water Resource Estimation';
        if (!isGwreType) return;

        const fetchGWRE = async () => {
            setGwreLoading(true);
            try {
                const params = { layer_type: 'groundwater_zone' };
                if (displayRegion) params.district = displayRegion;
                if (displayBlock) params.block = displayBlock;
                if (globalFilters?.gramPanchayat) params.grampanchayat = globalFilters.gramPanchayat;

                const data = await api.spatialLayer.getStatistics(params);
                if (!ignore) setGwreStats(data);
            } catch (err) {
                console.error('Failed to fetch GWRE stats:', err);
            } finally {
                if (!ignore) setGwreLoading(false);
            }
        };

        fetchGWRE();
        return () => { ignore = true; };
    }, [isGWRE, displayRegion, displayBlock, globalFilters?.gramPanchayat, globalFilters?.type]);

    const pieData = useMemo(() => {
        if (gwreStats?.distribution && gwreStats.distribution.length > 0) {
            const colors = {
                'Over Exploited': '#e63946',
                'Saline': '#457b9d',
                'Critical': '#f4a261',
                'Semi Critical': '#e9c46a',
                'Safe': '#2a9d8f'
            };
            return gwreStats.distribution.map(d => ({
                name: d.name,
                value: d.count,
                area: d.area,
                color: colors[d.name] || '#e2e8f0'
            }));
        }
        return [];
    }, [gwreStats]);

    const totalBlocks = useMemo(() => {
        return gwreStats?.total_count || pieData.reduce((sum, item) => sum + (item.value || 0), 0);
    }, [gwreStats, pieData]);

    return {
        gwreStats,
        gwreLoading,
        pieData,
        totalBlocks
    };
};
