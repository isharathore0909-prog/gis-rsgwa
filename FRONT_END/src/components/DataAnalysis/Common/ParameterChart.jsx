import React, { useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import SmartChartContainer from './SmartChartContainer';

/**
 * ParameterChart - Standardized on Highcharts
 * Mini donut chart for water quality parameters.
 */
const ParameterChart = ({ name, value, limit, unit, status }) => {
    const isExceeded = status === 'High' || status === 'Out Range';

    const options = useMemo(() => ({
        chart: {
            type: 'pie',
            backgroundColor: 'transparent',
            height: 100,
            style: { fontFamily: 'inherit' }
        },
        title: { text: null },
        plotOptions: {
            pie: {
                innerSize: '60%',
                dataLabels: { enabled: false },
                showInLegend: false,
                borderWidth: 0,
                states: { hover: { brightness: 0.1 } }
            }
        },
        tooltip: {
            headerFormat: '',
            pointFormat: '<b>{point.name}</b>: {point.y:.2f} ' + unit,
            borderRadius: 6,
            borderWidth: 0,
            shadow: true
        },
        series: [{
            name: name,
            data: [
                { name: 'Value', y: Math.min(value, limit), color: isExceeded ? '#e63946' : '#2a9d8f' },
                { name: 'Target', y: Math.max(0, limit - value), color: '#e5e7eb' }
            ],
            animation: false
        }],
        credits: { enabled: false }
    }), [name, value, limit, unit, isExceeded]);

    return (
        <div className="water-quality-mini-card" style={{ position: 'relative' }}>
            <SmartChartContainer height="100px">
                <HighchartsReact highcharts={Highcharts} options={options} />
            </SmartChartContainer>
            <div className="parameter-name">{name}</div>
            <div className="parameter-stats">
                <div>Amount: {typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value} {unit}</div>
                <div>Limit: {limit} {unit}</div>
            </div>
            <div className={`parameter-status ${isExceeded ? 'exceeded' : 'safe'}`}>
                {status}
            </div>
        </div>
    );
};

export default React.memo(ParameterChart);
