import React, { useState, useEffect, useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import ChartLoader from '../../Common/ChartLoader';
import api from '../../../api';
import * as Icons from 'lucide-react';

const WaterLevelAnalysisView = ({ filters, metricColor }) => {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Construct parameters - prioritize names over IDs as they are more reliable in this system
                const queryParams = {};
                if (filters.village) queryParams.village = filters.village;
                else if (filters.vlgId) queryParams.village_id = filters.vlgId;
                else if (filters.gramPanchayat) queryParams.grampanchayat = filters.gramPanchayat;
                else if (filters.gpId) queryParams.gp_id = filters.gpId;
                else if (filters.block) queryParams.block = filters.block;
                else if (filters.blockId) queryParams.block_id = filters.blockId;
                else if (filters.district) queryParams.district = filters.district;
                else if (filters.districtId) queryParams.district_id = filters.districtId;

                const res = await api.aquifer.getDecadalAnalysis(queryParams, signal);
                setData(res);
            } catch (err) {
                if (err.name !== 'AbortError' && err.message !== 'canceled') {
                    console.error("Failed to fetch decadal analysis:", err);
                }
            } finally {
                if (!signal.aborted) {
                    setIsLoading(false);
                }
            }
        };

        fetchData();
        return () => controller.abort();
    }, [filters]);

    // 1. Decadal Distribution Chart Options
    const distributionOptions = useMemo(() => {
        if (!data?.distribution) return null;

        return {
            chart: {
                type: 'column',
                backgroundColor: 'transparent',
                height: 400,
                style: { fontFamily: 'inherit' }
            },
            title: {
                text: 'Decadal Change in Water Levels (2015-2024)',
                style: { fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }
            },
            xAxis: {
                categories: data.distribution.map(d => d.range),
                title: { text: 'Decadal change in water level (m)' },
                labels: { style: { color: '#64748b', fontWeight: '600' } }
            },
            yAxis: {
                min: 0,
                title: { text: 'Number of Wells' },
                gridLineColor: '#f1f5f9'
            },
            legend: {
                align: 'center',
                verticalAlign: 'bottom',
                itemStyle: { fontWeight: '600', color: '#444' }
            },
            tooltip: {
                shared: true,
                headerFormat: '<b>Range: {point.key}m</b><br/>',
                pointFormat: '<span style="color:{series.color}">\u25CF</span> {series.name}: <b>{point.y} wells</b><br/>'
            },
            series: [
                {
                    name: 'Pre-Monsoon',
                    data: data.distribution.map(d => d.pre),
                    color: '#34d399' // Emerald 400
                },
                {
                    name: 'Post-Monsoon',
                    data: data.distribution.map(d => d.pst),
                    color: '#3b82f6' // Blue 500
                }
            ],
            credits: { enabled: false },
            plotOptions: {
                column: {
                    borderRadius: 4,
                    dataLabels: { enabled: true, style: { fontSize: '10px' } }
                }
            }
        };
    }, [data]);

    // 2. Regional Trend Chart Options
    const trendOptions = useMemo(() => {
        if (!data?.trends || data.trends.length === 0) return null;

        return {
            chart: {
                type: 'column',
                backgroundColor: 'transparent',
                height: 400,
                style: { fontFamily: 'inherit' }
            },
            title: {
                text: `Rising vs Depletion Trends by ${data.metadata.group_level || 'Location'}`,
                style: { fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }
            },
            xAxis: {
                categories: data.trends.map(t => t.location),
                labels: {
                    rotation: -45,
                    style: { fontSize: '10px', color: '#64748b' }
                }
            },
            yAxis: {
                min: 0,
                title: { text: 'Number of Wells' },
                gridLineColor: '#f1f5f9'
            },
            legend: {
                align: 'center',
                verticalAlign: 'bottom'
            },
            tooltip: {
                shared: true,
                pointFormat: '<span style="color:{series.color}">\u25CF</span> {series.name}: <b>{point.y} wells</b><br/>'
            },
            series: [
                {
                    name: 'Depletion',
                    data: data.trends.map(t => t.depletion),
                    color: '#ef4444' // Red 500
                },
                {
                    name: 'Rise',
                    data: data.trends.map(t => t.rise),
                    color: '#3b82f6' // Blue 500
                }
            ],
            credits: { enabled: false },
            plotOptions: {
                column: {
                    borderRadius: 4,
                    dataLabels: { enabled: true, style: { fontSize: '10px' } }
                }
            }
        };
    }, [data]);

    const hasData = useMemo(() => {
        if (!data) return false;
        const distSum = data.distribution?.reduce((acc, curr) => acc + (curr.pre || 0) + (curr.pst || 0), 0) || 0;
        const trendSum = data.trends?.reduce((acc, curr) => acc + (curr.rise || 0) + (curr.depletion || 0), 0) || 0;
        return distSum > 0 || trendSum > 0;
    }, [data]);

    if (!isLoading && !hasData) {
        const totalWells = data?.metadata?.total_wells || 0;

        return (
            <div style={{ padding: '40px', textAlign: 'center', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                <Icons.AlertCircle size={48} style={{ opacity: 0.2, marginBottom: '16px', margin: '0 auto' }} />
                <h3 style={{ color: '#1e293b', marginBottom: '8px' }}>
                    {totalWells > 0 ? 'Incomplete Decadal Data' : 'No Wells Found'}
                </h3>
                <p style={{ color: '#64748b', maxWidth: '400px', margin: '0 auto', fontSize: '14px' }}>
                    {totalWells > 0
                        ? `Found ${totalWells} wells at this location, but none have water level records for both 2015 AND 2024 required for decadal analysis.`
                        : "No monitoring wells were found matching the selected location filter."
                    }
                </p>
            </div>
        );
    }

    return (
        <div className="water-level-analysis-view" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '20px', marginBottom: '20px' }}>
            <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <ChartLoader isLoading={isLoading} height="400px">
                    {distributionOptions && <HighchartsReact highcharts={Highcharts} options={distributionOptions} />}
                </ChartLoader>
            </div>
            <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <ChartLoader isLoading={isLoading} height="400px">
                    {trendOptions && <HighchartsReact highcharts={Highcharts} options={trendOptions} />}
                </ChartLoader>
            </div>
        </div>
    );
};

export default WaterLevelAnalysisView;
