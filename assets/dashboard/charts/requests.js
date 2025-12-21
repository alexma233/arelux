import { getMetricLabel, metricColors, metricsConfig } from '../constants.js';
import { getLocale } from '../i18n.js';
import { formatCount, getBestCountUnit } from '../utils.js';

//4.有使用
export function updateRequestsSection(charts, results) {
    const locale = getLocale();
    const chartRequests = charts.requests;
    const metrics = metricsConfig.requests;
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

    const { unit, divisor } = getBestCountUnit(globalMax);

    metrics.forEach(metric => {
        const data = results[metric];
        if (!data || data.type !== 'time') return;

        // Update KPI
        document.getElementById(`kpi_${metric}`).innerText = formatCount(data.sum);

        if (timeData.length === 0) timeData = data.timeData;

        // Chart Data (Dynamic Unit)
        const valueData = data.valueData.map(v => {
            const val = v / divisor;
            return (divisor === 1) ? val : val.toFixed(2);
        });

        series.push({
            name: getMetricLabel(metric, locale),
            type: 'line',
            smooth: true,
            data: valueData,
            itemStyle: { color: metricColors[metric] },
            areaStyle: { opacity: 0.2 },
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
                const formattedVal = formatCount(rawVal);
                res += `${param.marker}${param.seriesName}: ${formattedVal}<br/>`;
            });
            return res;
        }},
        grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
        xAxis: { type: 'category', boundaryGap: false, data: timeData },
        yAxis: { type: 'value', name: unit },
        series: series
    };
    chartRequests.setOption(option);
}
