import React from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

const WaterLevelPreview = ({ districtWaterLevelData, metricColor }) => {
    if (!districtWaterLevelData || districtWaterLevelData.length === 0) return null;

    return (
        <div style={{ width: '100%', height: '360px' }}>
            <HighchartsReact
                highcharts={Highcharts}
                options={{
                    chart: {
                        type: 'column',
                        backgroundColor: 'transparent',
                        height: 360,
                        spacing: [10, 5, 10, 5]
                    },
                    title: { text: null },
                    xAxis: {
                        categories: districtWaterLevelData.map(d => d.name),
                        labels: {
                            rotation: -45,
                            style: { fontSize: '9px', fontWeight: '500' }
                        },
                        title: { text: null }
                    },
                    yAxis: {
                        title: { text: 'Depth (m.bgl)', style: { fontSize: '10px' } },
                        reversed: false,
                        gridLineWidth: 0.5
                    },
                    legend: { enabled: false },
                    credits: { enabled: false },
                    tooltip: {
                        pointFormat: 'Avg Depth: <b>{point.y} m.bgl</b>'
                    },
                    series: [{
                        name: 'Water Level',
                        data: districtWaterLevelData.map(d => d.value),
                        color: metricColor || '#3b82f6',
                        borderRadius: 4
                    }]
                }}
            />
        </div>
    );
};

export default WaterLevelPreview;
