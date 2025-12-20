import { metricColors, metricLabels, metricsConfig } from '../constants.js';
import { calculateTimeRange, formatCount } from '../utils.js';

//5.1. Security Section
export function updateSecuritySection(charts, results) {
    const chartSecurity = charts.security;
    const metrics = metricsConfig.security;

    // Check time range limit
    const { startTime, endTime } = calculateTimeRange();
    const start = new Date(startTime);
    const end = new Date(endTime);
    // Allow a small buffer
    if ((end - start) > (14 * 24 * 60 * 60 * 1000 + 60000)) {
        const kpiEl = document.getElementById('kpi_security_hits');
        if (kpiEl) {
            kpiEl.innerText = "范围过大";
            kpiEl.parentElement.querySelector('p').innerText = "仅支持查询14天内的数据";
            kpiEl.parentElement.querySelector('p').classList.add('text-red-500');
        }

        chartSecurity.clear();
        chartSecurity.setOption({
             title: {
                 text: '该指标仅支持查询14天内的数据',
                 left: 'center',
                 top: 'center',
                 textStyle: { color: '#9ca3af', fontSize: 14, fontWeight: 'normal' }
             }
        });
        return;
    }

    // Reset error style if applicable
    const kpiEl = document.getElementById('kpi_security_hits');
    if (kpiEl) {
        const p = kpiEl.parentElement.querySelector('p');
        if (p) {
            p.innerText = "DDoS/CC 防护总拦截次数";
            p.classList.remove('text-red-500');
        }
    }

    const series = [];
    let timeData = [];
    let totalHits = 0;

    metrics.forEach(metric => {
        const data = results[metric];
        if (!data || data.type !== 'time') return;

        totalHits += data.sum;

        if (timeData.length === 0) timeData = data.timeData;

        series.push({
            name: metricLabels[metric],
            type: 'line',
            smooth: true,
            stack: 'Total', // Stacked area chart
            areaStyle: {},
            emphasis: { focus: 'series' },
            data: data.valueData,
            itemStyle: { color: metricColors[metric] }
        });
    });

    // Update KPI
    if (kpiEl) {
        const formatted = formatCount(totalHits);
        kpiEl.innerText = formatted;
    }

    const option = {
        title: { show: false },
        tooltip: { 
            trigger: 'axis', 
            axisPointer: { type: 'cross', label: { backgroundColor: '#6a7985' } }
        },
        legend: { data: metrics.map(m => metricLabels[m]), bottom: 0 },
        grid: { left: '3%', right: '4%', bottom: '10%', top: '15%', containLabel: true },
        xAxis: { type: 'category', boundaryGap: false, data: timeData },
        yAxis: { type: 'value' },
        series: series
    };
    chartSecurity.setOption(option);
}
