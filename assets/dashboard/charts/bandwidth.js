import { metricColors, metricLabels, metricsConfig } from '../constants.js';
import { formatBps, getBestUnit } from '../utils.js';

//2.有使用
export function updateBandwidthSection(charts, results) {
    const chartBandwidth = charts.bandwidth;
    const metrics = metricsConfig.bandwidth;
    const series = [];
    let timeData = [];

    // Calculate global max
    let globalMax = 0;
    metrics.forEach(metric => {
        const data = results[metric];
        if (data && data.type === 'time') {
            const max = Math.max(...data.valueData);
            if (max > globalMax) globalMax = max;
        }
    });

    const { unit, divisor } = getBestUnit(globalMax, 'bandwidth');

    metrics.forEach(metric => {
        const data = results[metric];
        if (!data || data.type !== 'time') return;

        // Update KPI (Max/Peak)
        document.getElementById(`kpi_${metric}`).innerText = formatBps(data.max);

        if (timeData.length === 0) timeData = data.timeData;

        // Chart Data (Dynamic Unit)
        const valueData = data.valueData.map(v => (v / divisor).toFixed(2));

        series.push({
            name: metricLabels[metric],
            type: 'line',
            smooth: true,
            data: valueData,
            itemStyle: { color: metricColors[metric] },
            areaStyle: { opacity: 0.1 },
            // Store raw data
            rawData: data.valueData
        });
    });

    const option = {
        tooltip: { trigger: 'axis', formatter: (params) => {
            let res = params[0].axisValue + '<br/>';
            params.forEach(param => {
                const seriesIndex = param.seriesIndex;
                const dataIndex = param.dataIndex;
                const rawVal = series[seriesIndex].rawData[dataIndex];
                const formattedVal = formatBps(rawVal);
                res += `${param.marker}${param.seriesName}: ${formattedVal}<br/>`;
            });
            return res;
        }},
        legend: { data: metrics.map(m => metricLabels[m]), bottom: 0 },
        grid: { left: '3%', right: '4%', bottom: '10%', top: '15%', containLabel: true },
        xAxis: { type: 'category', boundaryGap: false, data: timeData },
        yAxis: { type: 'value', name: unit },
        series: series
    };
    chartBandwidth.setOption(option);
}
