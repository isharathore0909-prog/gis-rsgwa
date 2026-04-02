import { useState, useMemo, useEffect } from 'react';
import api from '../../api';

export const useGWREAnalysis = ({
    isGWRE,
    globalFilters,
    displayRegion,
    displayBlock,
    rajasthanId
}) => {
    const [gwreStats, setGwreStats] = useState(null);
    const [gwreLoading, setGwreLoading] = useState(false);
    const [apiRetryCount, setApiRetryCount] = useState(0);

    useEffect(() => {
        let ignore = false;
        const isGwreType = isGWRE || !globalFilters?.type || globalFilters?.type === 'Ground Water Resource Estimation';
        if (!isGwreType) {
            setGwreLoading(false);
            return;
        }

        const fetchGWRE = async () => {
            if (!rajasthanId) {
                setGwreLoading(false);
                return;
            }
            setGwreLoading(true);
            try {
                const params = { layer_type: 'groundwater_zone' };
                if (displayRegion) params.district = displayRegion;
                if (displayBlock) params.block = displayBlock;
                if (globalFilters?.gramPanchayat) params.grampanchayat = globalFilters.gramPanchayat;

                const data = await api.spatialLayer.getStatistics(params);
                if (!ignore) {
                    setGwreStats(prev => {
                        const nextStr = JSON.stringify(data);
                        if (JSON.stringify(prev) === nextStr) return prev;
                        return data;
                    });
                }
            } catch (err) {
                if (!ignore) {
                    console.error('Failed to fetch GWRE stats:', err);
                    // If backend returned connection error, retry after a delay
                    if (apiRetryCount < 3 && (!err.response || err.code === 'ERR_NETWORK' || err.message.includes('Network Error'))) {
                        const delay = 5000 * (apiRetryCount + 1);
                        setTimeout(() => {
                            if (!ignore) setApiRetryCount(prev => prev + 1);
                        }, delay);
                    } else {
                        setGwreStats(null);
                    }
                }
            } finally {
                if (!ignore) setGwreLoading(false);
            }
        };

        fetchGWRE();
        return () => { ignore = true; };
    }, [isGWRE, displayRegion, displayBlock, globalFilters?.gramPanchayat, globalFilters?.type, rajasthanId, apiRetryCount]);

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
                value: parseFloat(d.count) || 0,
                area: parseFloat(d.area) || 0,
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
