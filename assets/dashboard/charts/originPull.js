import { metricColors, metricLabels, metricsConfig } from '../constants.js';
import {
  formatBps,
  formatBytes,
  formatCount,
  getBestCountUnit,
  getBestUnit,
} from '../utils.js';

//3.有使用
export function updateOriginPullSection(charts, results) {
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
            } else if (metric.includes('Bandwidth')) {
                 kpiEl.innerText = formatBps(data.max);
            } else if (metric.includes('request')) {
                 kpiEl.innerText = formatCount(data.sum);
            } else {
                 kpiEl.innerText = data.sum.toLocaleString();
            }
        }

        if (timeData.length === 0) timeData = data.timeData;

        let chartData = [];
        let unit = '';
        let divisor = 1;

        // Normalize data for chart
        if (metric.includes('Flux')) {
            unit = fluxUnit.unit;
            divisor = fluxUnit.divisor;
        } else if (metric.includes('Bandwidth')) {
            unit = bandwidthUnit.unit;
            divisor = bandwidthUnit.divisor;
        } else if (metric.includes('request')) {
            unit = requestUnit.unit;
            divisor = requestUnit.divisor;
        } else {
            unit = '';
            divisor = 1;
        }

        chartData = data.valueData.map(v => {
            const val = v / divisor;
            return (divisor === 1) ? val : val.toFixed(2);
        });

        series.push({
            name: metricLabels[metric],
            type: 'line',
            smooth: true,
            data: chartData,
            itemStyle: { color: metricColors[metric] },
            areaStyle: { opacity: 0.1 },
            customUnit: unit,
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

                    const unit = series[seriesIndex].customUnit || '';
                    let formattedVal = '';

                    if (unit.includes('bps')) {
                        formattedVal = formatBps(rawVal);
                    } else if (unit.includes('B')) {
                        formattedVal = formatBytes(rawVal);
                    } else if (unit.includes('千') || unit.includes('万') || unit.includes('亿')) {
                        formattedVal = formatCount(rawVal);
                    } else {
                        formattedVal = rawVal.toLocaleString();
                    }

                    res += `${param.marker}${param.seriesName}: ${formattedVal}<br/>`;
                });
                return res;
            }
        },
        legend: { data: metrics.map(m => metricLabels[m]), bottom: 0 },
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
}
