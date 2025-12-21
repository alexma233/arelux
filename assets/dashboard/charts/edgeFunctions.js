import { getMetricLabel, metricColors, metricsConfig } from '../constants.js';
import { getLocale } from '../i18n.js';
import { formatCount, getBestCountUnit } from '../utils.js';

export function updateEdgeFunctionsSection(charts, results) {
    const locale = getLocale();
    const chartFunctionRequests = charts.functionRequests;
    const chartFunctionCpu = charts.functionCpu;
    const metrics = metricsConfig.edgeFunctions;

    // Map metrics to specific charts and KPIs
    const metricMap = {
        'function_requestCount': {
            chart: chartFunctionRequests,
            kpiId: 'kpi_function_requestCount',
            unitType: 'count',
            color: metricColors['function_requestCount']
        },
        'function_cpuCostTime': {
            chart: chartFunctionCpu,
            kpiId: 'kpi_function_cpuCostTime',
            unitType: 'ms',
            color: metricColors['function_cpuCostTime']
        }
    };

    metrics.forEach(metric => {
        const config = metricMap[metric];
        if (!config) return;

        const data = results[metric];
        if (!data || data.type !== 'time') return;

        // Update KPI
        const kpiEl = document.getElementById(config.kpiId);
            if (kpiEl) {
                if (config.unitType === 'count') {
                    kpiEl.innerText = formatCount(data.sum);
                } else if (config.unitType === 'ms') {
                    // Format large numbers with commas
                    kpiEl.innerText = data.sum.toLocaleString(locale) + ' ms';
                }
            }

        // Chart
        const chart = config.chart;
        if (!chart) return;

        let seriesData = data.valueData;
        let unit = '';
        let divisor = 1;

        if (config.unitType === 'count') {
             const best = getBestCountUnit(Math.max(...data.valueData));
             unit = best.unit;
             divisor = best.divisor;
             seriesData = data.valueData.map(v => {
                const val = v / divisor;
                return (divisor === 1) ? val : val.toFixed(2);
             });
        } else if (config.unitType === 'ms') {
             unit = 'ms';
        }

        const option = {
            tooltip: { trigger: 'axis', formatter: (params) => {
                let res = params[0].axisValue + '<br/>';
                params.forEach(param => {
                    const val = data.valueData[param.dataIndex];
                    let formattedVal = val;
                    if (config.unitType === 'count') formattedVal = formatCount(val);
                    else formattedVal = val.toLocaleString(locale) + ' ms';

                    res += `${param.marker}${param.seriesName}: ${formattedVal}<br/>`;
                });
                return res;
            }},
            legend: { data: [getMetricLabel(metric, locale)], bottom: 0 },
            grid: { left: '3%', right: '4%', bottom: '10%', top: '15%', containLabel: true },
            xAxis: { type: 'category', boundaryGap: false, data: data.timeData },
            yAxis: { type: 'value', name: unit },
            series: [{
                name: getMetricLabel(metric, locale),
                type: 'line',
                smooth: true,
                data: seriesData,
                itemStyle: { color: config.color },
                areaStyle: { opacity: 0.1 }
            }]
        };
        chart.setOption(option);
    });
}
