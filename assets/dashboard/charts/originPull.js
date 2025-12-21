import { getMetricLabel, metricColors, metricsConfig } from '../constants.js';
import { getLocale } from '../i18n.js';
import {
  formatBps,
  formatBytes,
  formatCount,
  getBestCountUnit,
  getBestUnit,
} from '../utils.js';
import { updateKpiCompare } from '../compare.js';

//3.有使用
export function updateOriginPullSection(charts, results, compareResults, compareEnabled) {
    const locale = getLocale();
    const chartOriginPull = charts.originPull;
    const metrics = metricsConfig.originPull;
    const series = [];
    let timeData = [];

    // Calculate global max for Flux, Bandwidth and Requests separately
    let maxFlux = 0;
    let maxBandwidth = 0;
    let maxRequests = 0;

    metrics.forEach(metric => {
        const data = results[metric];
        if (data && data.type === 'time') {
            const max = Math.max(...data.valueData);
            if (metric.includes('Flux')) {
                if (max > maxFlux) maxFlux = max;
            } else if (metric.includes('Bandwidth')) {
                if (max > maxBandwidth) maxBandwidth = max;
            } else if (metric.includes('request')) {
                if (max > maxRequests) maxRequests = max;
            }
        }
    });

    const fluxUnit = getBestUnit(maxFlux, 'bytes');
    const bandwidthUnit = getBestUnit(maxBandwidth, 'bandwidth');
    const requestUnit = getBestCountUnit(maxRequests);

    metrics.forEach(metric => {
        const data = results[metric];
        if (!data || data.type !== 'time') return;

        // Update KPI
        const kpiEl = document.getElementById(`kpi_${metric}`);
        if (kpiEl) {
            if (metric.includes('Flux')) {
                 kpiEl.innerText = formatBytes(data.sum);
                 updateKpiCompare(metric, data.sum, compareResults?.[metric]?.sum, compareEnabled);
            } else if (metric.includes('Bandwidth')) {
                 kpiEl.innerText = formatBps(data.max);
                 updateKpiCompare(metric, data.max, compareResults?.[metric]?.max, compareEnabled);
            } else if (metric.includes('request')) {
                 kpiEl.innerText = formatCount(data.sum);
                 updateKpiCompare(metric, data.sum, compareResults?.[metric]?.sum, compareEnabled);
            } else {
                 kpiEl.innerText = data.sum.toLocaleString(locale);
                 updateKpiCompare(metric, data.sum, compareResults?.[metric]?.sum, compareEnabled);
            }
        }

        if (timeData.length === 0) timeData = data.timeData;

        let chartData = [];
        let unit = '';
        let divisor = 1;

        // Normalize data for chart
        let valueType = 'number';
        if (metric.includes('Flux')) {
            unit = fluxUnit.unit;
            divisor = fluxUnit.divisor;
            valueType = 'bytes';
        } else if (metric.includes('Bandwidth')) {
            unit = bandwidthUnit.unit;
            divisor = bandwidthUnit.divisor;
            valueType = 'bps';
        } else if (metric.includes('request')) {
            unit = requestUnit.unit;
            divisor = requestUnit.divisor;
            valueType = 'count';
        } else {
            unit = '';
            divisor = 1;
        }

        chartData = data.valueData.map(v => {
            const val = v / divisor;
            return (divisor === 1) ? val : val.toFixed(2);
        });

        series.push({
            name: getMetricLabel(metric, locale),
            type: 'line',
            smooth: true,
            data: chartData,
            itemStyle: { color: metricColors[metric] },
            areaStyle: { opacity: 0.1 },
            customUnit: unit,
            valueType,
            rawData: data.valueData
        });
    });

    const option = {
        title: { show: false },
        tooltip: { 
            trigger: 'axis',
            formatter: (params) => {
                let res = params[0].axisValue + '<br/>';
                params.forEach(param => {
                    const seriesIndex = param.seriesIndex;
                    const dataIndex = param.dataIndex;
                    const rawVal = series[seriesIndex].rawData[dataIndex];

                    let formattedVal = '';

                    if (series[seriesIndex].valueType === 'bps') {
                        formattedVal = formatBps(rawVal);
                    } else if (series[seriesIndex].valueType === 'bytes') {
                        formattedVal = formatBytes(rawVal);
                    } else if (series[seriesIndex].valueType === 'count') {
                        formattedVal = formatCount(rawVal);
                    } else {
                        formattedVal = rawVal.toLocaleString(locale);
                    }

                    res += `${param.marker}${param.seriesName}: ${formattedVal}<br/>`;
                });
                return res;
            }
        },
        legend: { data: metrics.map(m => getMetricLabel(m, locale)), bottom: 0 },
        grid: { left: '3%', right: '4%', bottom: '10%', top: '15%', containLabel: true },
        xAxis: { type: 'category', boundaryGap: false, data: timeData },
        yAxis: { type: 'value' },
        series: series
    };
    chartOriginPull.setOption(option);

    // Calculate Cache Hit Rate
    // Formula: 1 - (Origin Response Flux / EdgeOne Response Flux)
    const originFluxData = results['l7Flow_inFlux_hy']; // Origin Response
    const edgeFluxData = results['l7Flow_outFlux']; // EdgeOne Response

    let hitRate = 0;
    if (originFluxData && edgeFluxData && edgeFluxData.sum > 0) {
        hitRate = 1 - (originFluxData.sum / edgeFluxData.sum);
    }
    // Clamp hitRate if necessary (e.g. if origin > edge due to compression diffs, it might be negative, but let's show real value or clamp?)
    // Usually hit rate is 0-1.

    const hitRateEl = document.getElementById('kpi_cache_hit_rate');
    if (hitRateEl) {
        hitRateEl.innerText = (hitRate * 100).toFixed(2) + '%';
    }

    const prevOriginFlux = compareResults?.['l7Flow_inFlux_hy'];
    const prevEdgeFlux = compareResults?.['l7Flow_outFlux'];
    let prevHitRate = NaN;
    if (prevOriginFlux && prevEdgeFlux && prevEdgeFlux.sum > 0) {
      prevHitRate = 1 - (prevOriginFlux.sum / prevEdgeFlux.sum);
    }
    updateKpiCompare('cache_hit_rate', hitRate, prevHitRate, compareEnabled);
}
