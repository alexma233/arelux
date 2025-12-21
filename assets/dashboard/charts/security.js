import { getMetricLabel, metricColors, metricsConfig } from '../constants.js';
import { getLocale, t } from '../i18n.js';
import { calculateTimeRange, formatCount } from '../utils.js';
import { updateKpiCompareByKpiId } from '../compare.js';

//5.1. Security Section
export function updateSecuritySection(charts, results, compareResults, compareEnabled) {
    const locale = getLocale();
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
            kpiEl.innerText = t('errors.rangeTooLarge');
            const desc = kpiEl.parentElement.querySelector('p[data-i18n="charts.securityHitsDescription"]');
            if (desc) {
              desc.innerText = t('errors.securityOnly14d');
              desc.classList.add('text-red-500');
            }
        }
        updateKpiCompareByKpiId('kpi_security_hits', NaN, NaN, false);

        chartSecurity.clear();
        chartSecurity.setOption({
             title: {
                 text: t('errors.securityOnly14dTitle'),
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
        const desc = kpiEl.parentElement.querySelector('p[data-i18n="charts.securityHitsDescription"]');
        if (desc) {
          desc.innerText = t('charts.securityHitsDescription');
          desc.classList.remove('text-red-500');
        }
    }

    const series = [];
    let timeData = [];
    let totalHits = 0;
    let prevTotalHits = 0;
    let prevAvailable = true;

    metrics.forEach(metric => {
        const data = results[metric];
        if (!data || data.type !== 'time') return;

        totalHits += data.sum;
        if (compareEnabled) {
          const prev = compareResults?.[metric];
          if (!prev || prev.type !== 'time') prevAvailable = false;
          else prevTotalHits += prev.sum;
        }

        if (timeData.length === 0) timeData = data.timeData;

        series.push({
            name: getMetricLabel(metric, locale),
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
    updateKpiCompareByKpiId('kpi_security_hits', totalHits, prevAvailable ? prevTotalHits : NaN, compareEnabled);

    const option = {
        title: { show: false },
        tooltip: { 
            trigger: 'axis', 
            axisPointer: { type: 'cross', label: { backgroundColor: '#6a7985' } }
        },
        legend: { data: metrics.map(m => getMetricLabel(m, locale)), bottom: 0 },
        grid: { left: '3%', right: '4%', bottom: '10%', top: '15%', containLabel: true },
        xAxis: { type: 'category', boundaryGap: false, data: timeData },
        yAxis: { type: 'value' },
        series: series
    };
    chartSecurity.setOption(option);
}
