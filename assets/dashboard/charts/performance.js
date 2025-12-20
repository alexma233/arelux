import { metricColors, metricLabels, metricsConfig } from '../constants.js';

//5.有使用
export function updatePerformanceSection(charts, results) {
    const chartPerformance = charts.performance;
    const metrics = metricsConfig.performance;
    const series = [];
    let timeData = [];

    metrics.forEach(metric => {
        const data = results[metric];
        if (!data || data.type !== 'time') return;

        // Update KPI (Avg)
        document.getElementById(`kpi_${metric}`).innerText = data.avg.toFixed(2) + ' ms';

        if (timeData.length === 0) timeData = data.timeData;

        series.push({
            name: metricLabels[metric],
            type: 'line',
            smooth: true,
            data: data.valueData,
            itemStyle: { color: metricColors[metric] }
        });
    });

    const option = {
        tooltip: { trigger: 'axis', formatter: '{b}<br/>{a}: {c} ms' },
        legend: { data: metrics.map(m => metricLabels[m]), bottom: 0 },
        grid: { left: '3%', right: '4%', bottom: '10%', top: '15%', containLabel: true },
        xAxis: { type: 'category', boundaryGap: false, data: timeData },
        yAxis: { type: 'value', name: 'ms' },
        series: series
    };
    chartPerformance.setOption(option);
}
