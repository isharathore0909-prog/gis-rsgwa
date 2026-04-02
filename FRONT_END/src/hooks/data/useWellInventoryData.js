import { useMemo } from 'react';
import { useWellAquifer } from './WellInventory/useWellAquifer';
import { useWellRainfall } from './WellInventory/useWellRainfall';

export const useWellInventoryData = (params) => {
    const {
        loading, listData, nearbyData, nearbyLoading,
        regionalStats, yearlyTrends, error
    } = useWellAquifer(params);

    const { rainfallData, rainfallLoading } = useWellRainfall(params);

    // Data Aggregation
    const aggregatedChartData = useMemo(() => {
        if (yearlyTrends?.yearly_trends) {
            return yearlyTrends.yearly_trends.map(t => ({
                year: t.year,
                'Pre-Monsoon': t.pre_monsoon,
                'Post-Monsoon': t.post_monsoon,
                'Average Water Level': t.average,
                'Annual Rainfall': rainfallData[t.year] ? rainfallData[t.year] / 1000 : null
            }));
        }

        if (!listData || listData.length === 0) return [];
        const years = Array.from({ length: 10 }, (_, i) => 2015 + i);
        return years.map(year => {
            let preSum = 0, preCount = 0;
            let pstSum = 0, pstCount = 0;

            listData.forEach(record => {
                const preVal = record[`pre_${year}`];
                const pstVal = record[`pst_${year}`];
                if (preVal != null) { preSum += parseFloat(preVal); preCount++; }
                if (pstVal != null) { pstSum += parseFloat(pstVal); pstCount++; }
            });

            return {
                year: year.toString(),
                'Pre-Monsoon': preCount > 0 ? parseFloat((preSum / preCount).toFixed(2)) : null,
                'Post-Monsoon': pstCount > 0 ? parseFloat((pstSum / pstCount).toFixed(2)) : null,
                'Average Water Level': (preCount > 0 || pstCount > 0) ? parseFloat(((preSum + pstSum) / (preCount + pstCount)).toFixed(2)) : null,
                'Annual Rainfall': rainfallData[year.toString()] ? rainfallData[year.toString()] / 1000 : null
            };
        });
    }, [yearlyTrends, listData, rainfallData]);

    const nearbyChartData = useMemo(() => {
        if (!nearbyData || !nearbyData.averages) return [];
        const years = Array.from({ length: 10 }, (_, i) => 2015 + i);
        return years.map(year => ({
            year: year.toString(),
            'Pre-Monsoon': nearbyData.averages[year]?.pre?.toFixed(2) || null,
            'Post-Monsoon': nearbyData.averages[year]?.pst?.toFixed(2) || null,
            'Average Water Level': nearbyData.averages[year]?.avg || null,
            'Annual Rainfall': rainfallData[year.toString()] ? rainfallData[year.toString()] / 1000 : null
        }));
    }, [nearbyData, rainfallData]);

    const aquiferDistribution = useMemo(() => {
        if (regionalStats?.aquifer_distribution) {
            return regionalStats.aquifer_distribution.map(d => ({
                name: d.aquifer || 'Unknown',
                value: d.count
            }));
        }

        if (!listData || listData.length === 0) return [];
        const counts = {};
        listData.forEach(record => {
            const aq = record.aquifer || 'Unknown';
            counts[aq] = (counts[aq] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [regionalStats, listData]);

    return {
        loading,
        listData,
        nearbyData,
        nearbyLoading,
        rainfallData,
        rainfallLoading,
        aggregatedChartData,
        nearbyChartData,
        aquiferDistribution,
        totalWells: regionalStats?.summary?.total_wells || listData.length,
        error
    };
};
