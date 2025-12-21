import { getMetricLabel, metricColors, metricsConfig } from '../constants.js';
import { getLocale } from '../i18n.js';
import { formatBytes, getBestUnit } from '../utils.js';

export function updateTrafficSection(charts, results) {
    const locale = getLocale();
    const chartTraffic = charts.traffic;
    const metrics = metricsConfig.traffic;
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

    const { unit, divisor } = getBestUnit(globalMax, 'bytes');

    metrics.forEach(metric => {
        const data = results[metric];
        if (!data || data.type !== 'time') return;

        // Update KPI
        document.getElementById(`kpi_${metric}`).innerText = formatBytes(data.sum);

        if (timeData.length === 0) timeData = data.timeData;

        // Chart Data (Dynamic Unit)
        const valueData = data.valueData.map(v => (v / divisor).toFixed(2));

        series.push({
            name: getMetricLabel(metric, locale),
            type: 'line',
            smooth: true,
            data: valueData,
            itemStyle: { color: metricColors[metric] },
            areaStyle: { opacity: 0.1 },
            // Store raw data for tooltip
            rawData: data.valueData
        });
    });

    const option = {
        tooltip: { trigger: 'axis', formatter: (params) => {
            let res = params[0].axisValue + '<br/>';
            params.forEach(param => {
                // Access raw data using dataIndex
                const seriesIndex = param.seriesIndex;
                const dataIndex = param.dataIndex;
                const rawVal = series[seriesIndex].rawData[dataIndex];
                const formattedVal = formatBytes(rawVal);

                res += `${param.marker}${param.seriesName}: ${formattedVal}<br/>`;
            });
            return res;
        }},
        legend: { data: metrics.map(m => getMetricLabel(m, locale)), bottom: 0 },
        grid: { left: '3%', right: '4%', bottom: '10%', top: '15%', containLabel: true },
        xAxis: { type: 'category', boundaryGap: false, data: timeData },
        yAxis: { type: 'value', name: unit },
        series: series
    };
    chartTraffic.setOption(option);
}
