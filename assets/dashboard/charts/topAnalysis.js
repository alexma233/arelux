import {
  codeToMapName,
  countryMap,
  metricLabels,
  provinceMap,
  worldNameMap,
} from '../constants.js';
import {
  formatBytes,
  formatCount,
  getBestCountUnit,
  getBestUnit,
} from '../utils.js';

//通用处理
const renderTopChart = (results, chartInstance, metricName, mapObject = null) => {
    const data = results[metricName];

    if (!data || data.type !== 'top' || !data.data) return;

    const sortedData = [...data.data].sort((a, b) => b.Value - a.Value).slice(0, 10);

    let unit = '';
    let divisor = 1;
    let label = metricLabels[metricName] || '';

    if (metricName.includes('outFlux')) {
        const maxVal = sortedData.length > 0 ? sortedData[0].Value : 0;
        const best = getBestUnit(maxVal, 'bytes');
        unit = best.unit;
        divisor = best.divisor;
    } else {
        const maxVal = sortedData.length > 0 ? sortedData[0].Value : 0;
        const best = getBestCountUnit(maxVal);
        unit = best.unit;
        divisor = best.divisor;
    }

    const yAxisData = sortedData.map(item => mapObject?.[item.Key] || item.Key).reverse(); //问题点：没对“字段不存在”的短横杠做判断
    const seriesData = sortedData.map(item => {
        const val = item.Value / divisor;
        return (divisor === 1) ? val : val.toFixed(2);
    }).reverse();

    let color = '#3b82f6';
    const lowerName = metricName.toLowerCase();
    if (lowerName.includes('country')) color = '#3b82f6';
    else if (lowerName.includes('province') || lowerName.includes('resourcetype') || lowerName.includes('browser')) color = '#f59e0b';
    else if (lowerName.includes('statuscode') || lowerName.includes('referer') || lowerName.endsWith('_ua')) color = '#8b5cf6';
    else if (lowerName.includes('domain') || lowerName.includes('device')) color = '#06b6d4';
    else if (lowerName.includes('url') || lowerName.includes('os')) color = '#10b981';
    else if (lowerName.includes('sip')) color = '#ef4444';

    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: (params) => {
                 const param = params[0];
                 let name = param.name;
                 if (name.length > 100) name = name.substring(0, 100) + '...';

                 const rawVal = sortedData[sortedData.length - 1 - param.dataIndex].Value;

                 let formattedVal = '';
                 if (metricName.includes('outFlux')) {
                     formattedVal = formatBytes(rawVal);
                 } else {
                     const fVal = formatCount(rawVal);
                     // Append '次' if not present in unit (formatCount returns unit, but we might want explicit '次')
                     // formatCount returns "1.23 万". "1.23 万次" sounds good.
                     // "500" -> "500 次".
                     formattedVal = fVal + (fVal.includes('千') || fVal.includes('万') || fVal.includes('亿') ? '次' : ' 次');
                 }

                 return `${name}<br/>${param.marker}${label}: ${formattedVal}`;
            }
        },
        grid: { left: '3%', right: '10%', bottom: '3%', containLabel: true },
        xAxis: { type: 'value', name: unit },
        yAxis: { 
            type: 'category', 
            data: yAxisData,
            axisLabel: {
                formatter: function (value) {
                    if (value.length > 20) return value.substring(0, 20) + '...';
                    return value;
                }
            }
        },
        series: [
            {
                name: label,
                type: 'bar',
                data: seriesData,
                itemStyle: { color: color },
                label: { show: true, position: 'right' }
            }
        ]
    };
    chartInstance.setOption(option);
};

function updateTopMapChart(charts, results) {
    const chartTopMap = charts.topMap;
    const metric = 'l7Flow_request_country';
    const data = results[metric];

    if (!data || data.type !== 'top' || !data.data) return;

    // Map data to ECharts format
    // IMPORTANT: The 'name' here must match the region name AFTER nameMap is applied.
    // Since worldNameMap maps English names to Chinese (e.g. "China" -> "中国大陆"),
    // our data points must also use the Chinese names (e.g. "中国大陆") to match the map regions.
    const mapData = data.data.map(item => {
        const name = countryMap[item.Key] || codeToMapName[item.Key] || item.Key;
        return {
            name: name,
            value: item.Value
        };
    });

    const maxVal = mapData.length > 0 ? Math.max(...mapData.map(item => item.value)) : 0;

    const option = {
        tooltip: {
            trigger: 'item',
            formatter: function (params) {
                const val = params.value;
                return `${params.name}<br/>请求数: ${val ? val.toLocaleString() : 0} 次`;
            }
        },
        visualMap: {
            min: 0,
            max: maxVal,
            left: 'left',
            top: 'bottom',
            text: ['High', 'Low'],
            calculable: true,
            inRange: {
                color: ['#e0f2fe', '#0284c7']
            }
        },
        series: [
            {
                name: '请求数',
                type: 'map',
                mapType: 'world',
                roam: true,
                nameMap: worldNameMap,
                itemStyle: {
                    emphasis: { label: { show: true } }
                },
                data: mapData
            }
        ]
    };

    chartTopMap.setOption(option);
}

//6.有使用
export function updateTopAnalysisSection(charts, results) {
    const {
        topCountry: chartTopCountry,
        topProvince: chartTopProvince,
        topStatusCode: chartTopStatusCode,
        topDomain: chartTopDomain,
        topUrl: chartTopUrl,
        topResourceType: chartTopResourceType,
        topSip: chartTopSip,
        topReferer: chartTopReferer,
        topUaDevice: chartTopUaDevice,
        topUaBrowser: chartTopUaBrowser,
        topUaOs: chartTopUaOs,
        topUa: chartTopUa,
        topRequestCountry: chartTopRequestCountry,
        topRequestProvince: chartTopRequestProvince,
        topRequestStatusCode: chartTopRequestStatusCode,
        topRequestDomain: chartTopRequestDomain,
        topRequestUrl: chartTopRequestUrl,
        topRequestResourceType: chartTopRequestResourceType,
        topRequestSip: chartTopRequestSip,
        topRequestReferer: chartTopRequestReferer,
        topRequestUaDevice: chartTopRequestUaDevice,
        topRequestUaBrowser: chartTopRequestUaBrowser,
        topRequestUaOs: chartTopRequestUaOs,
        topRequestUa: chartTopRequestUa,
    } = charts;
    updateTopMapChart(charts, results);

    // Flux Charts
    renderTopChart(results, chartTopCountry, 'l7Flow_outFlux_country', countryMap);
    renderTopChart(results, chartTopProvince, 'l7Flow_outFlux_province', provinceMap);
    renderTopChart(results, chartTopStatusCode, 'l7Flow_outFlux_statusCode');
    renderTopChart(results, chartTopDomain, 'l7Flow_outFlux_domain');
    renderTopChart(results, chartTopUrl, 'l7Flow_outFlux_url');
    renderTopChart(results, chartTopResourceType, 'l7Flow_outFlux_resourceType');
    renderTopChart(results, chartTopSip, 'l7Flow_outFlux_sip');
    //renderTopChart(results, chartTopReferer, 'l7Flow_outFlux_referers'); //以前方案
    updateTopRefererChart(results, chartTopReferer); //降级处理，包含“字段不存在”处理
    renderTopChart(results, chartTopUaDevice, 'l7Flow_outFlux_ua_device');
    renderTopChart(results, chartTopUaBrowser, 'l7Flow_outFlux_ua_browser');
    renderTopChart(results, chartTopUaOs, 'l7Flow_outFlux_ua_os');
    renderTopChart(results, chartTopUa, 'l7Flow_outFlux_ua');

    // Request Charts
    renderTopChart(results, chartTopRequestCountry, 'l7Flow_request_country', countryMap);
    renderTopChart(results, chartTopRequestProvince, 'l7Flow_request_province', provinceMap);
    renderTopChart(results, chartTopRequestStatusCode, 'l7Flow_request_statusCode');
    renderTopChart(results, chartTopRequestDomain, 'l7Flow_request_domain');
    renderTopChart(results, chartTopRequestUrl, 'l7Flow_request_url');
    renderTopChart(results, chartTopRequestResourceType, 'l7Flow_request_resourceType');
    renderTopChart(results, chartTopRequestSip, 'l7Flow_request_sip');
    //renderTopChart(results, chartTopRequestReferer, 'l7Flow_request_referers');
    updateTopRequestRefererChart(results, chartTopRequestReferer); //降级方案
    renderTopChart(results, chartTopRequestUaDevice, 'l7Flow_request_ua_device');
    renderTopChart(results, chartTopRequestUaBrowser, 'l7Flow_request_ua_browser');
    renderTopChart(results, chartTopRequestUaOs, 'l7Flow_request_ua_os');
    renderTopChart(results, chartTopRequestUa, 'l7Flow_request_ua');
}

function updateTopRefererChart(results, chartTopReferer) {
    const metric = 'l7Flow_outFlux_referers';
    const data = results[metric];

    if (!data || data.type !== 'top' || !data.data) return;

    // Sort by value (descending)
    const sortedData = [...data.data].sort((a, b) => b.Value - a.Value).slice(0, 10); // Top 10

    const yAxisData = sortedData.map(item => {
        // Clean up key: remove backticks and trim
        let key = item.Key.replace(/`/g, '').trim();
        if (!key || key === '-') return '字段不存在'; //无/直接访问
        return key;
    }).reverse();

    const seriesData = sortedData.map(item => (item.Value / (1024 * 1024 * 1024)).toFixed(2)).reverse(); // GB

    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: (params) => {
                 const param = params[0];
                 return `${param.name}<br/>${param.marker}流量: ${param.value} GB`;
            }
        },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: { type: 'value', name: 'GB' },
        yAxis: { 
            type: 'category', 
            data: yAxisData,
            axisLabel: {
                formatter: function (value) {
                    // Truncate long URLs
                    if (value.length > 30) {
                        return value.substring(0, 30) + '...';
                    }
                    return value;
                }
            }
        },
        series: [
            {
                name: '流量',
                type: 'bar',
                data: seriesData,
                itemStyle: { color: '#8b5cf6' }, // Purple
                label: { show: true, position: 'right' }
            }
        ]
    };

    chartTopReferer.setOption(option);
}

function updateTopRequestRefererChart(results, chartTopRequestReferer) {
    const metric = 'l7Flow_request_referers';
    const data = results[metric];

    if (!data || data.type !== 'top' || !data.data) return;

    // Sort by value (descending)
    const sortedData = [...data.data].sort((a, b) => b.Value - a.Value).slice(0, 10); // Top 10

    const yAxisData = sortedData.map(item => {
         let key = item.Key;
         if (key === '-') return '字段不存在'; //直接访问
         // Clean up backticks and extra spaces
         key = key.replace(/`/g, '').trim();
         return key.substring(0, 50) + (key.length > 50 ? '...' : '');
    }).reverse();
    const seriesData = sortedData.map(item => item.Value).reverse();

    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: (params) => {
                 const param = params[0];
                 // Find full referer string
                 const originalItem = sortedData.find((item, index) => index === (sortedData.length - 1 - param.dataIndex));
                 let fullName = param.name;
                 if (originalItem) {
                     let key = originalItem.Key;
                     if (key === '-') fullName = '字段不存在'; //直接访问
                     else fullName = key.replace(/`/g, '').trim();
                 }
                 return `${fullName}<br/>${param.marker}请求数: ${param.value.toLocaleString()} 次`;
            }
        },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: { type: 'value', name: '次' },
        yAxis: { type: 'category', data: yAxisData, axisLabel: { interval: 0, width: 200, overflow: 'truncate' } },
        series: [
            {
                name: '请求数',
                type: 'bar',
                data: seriesData,
                itemStyle: { color: '#ec4899' },
                label: { show: true, position: 'right' }
            }
        ]
    };

    chartTopRequestReferer.setOption(option);
}
