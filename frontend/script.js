// 全局变量：地图实例、垃圾数据列表、摄像头流
let garbageMap;
let garbageData = [];
let cameraStream;
// AQI auto-refresh timers
let aqiTimeout = null;
let aqiInterval = null;
let nextAqiRefresh = null;
// AQI location defaults (Macau)
let aqiLat = 22.1987;
let aqiLng = 113.5439;
let aqiPlace = '澳门 / Macau';

// 页面加载完成后初始化
document.addEventListener("DOMContentLoaded", () => {
    initMap(); // 初始化地图
    initCityMaps(); // 初始化多个城市的小地图（上海、北京、广州、深圳、纽约）
    setupModeSelection(); // 模式选择：垃圾识别 / 垃圾分布
    bindFilterEvents(); // 绑定筛选事件
    bindExportEvent(); // 绑定导出事件
    bindImportEvent(); // 绑定导入事件
    bindRandomGarbageEvent(); // 绑定随机定位垃圾事件
    showWeather(); // 显示实时天气
    showCyclones(); // 显示太平洋气旋
    showFloods(); // 显示水浸灾害
    setupHeatmapSwitch(); // 热力图切换
    setupLangSwitch(); // 多语言切换
    showDisasterAlert(); // 灾害预警
    setupIntroAnimation(); // 页面入场动画控制
    initDisasterSimulation(); // 初始化灾害模拟
    // 初始化空气质量显示
    try {
        // 默认使用澳门坐标（如果希望以主地图中心为准，可改为读取 garbageMap.getCenter()）
        showAirQuality(aqiLat, aqiLng);
        scheduleAqiAutoRefresh(aqiLat, aqiLng);
        const refreshBtn = document.getElementById('refreshAqi');
        if (refreshBtn) refreshBtn.addEventListener('click', () => {
            showAirQuality(aqiLat, aqiLng);
            scheduleAqiAutoRefresh(aqiLat, aqiLng);
        });
    } catch (e) {}
});

// 设置 AQI 请求使用的地点（更新显示名和经纬度）
function setAqiLocation(name, lat, lng) {
    if (name) aqiPlace = name;
    if (typeof lat === 'number') aqiLat = lat;
    if (typeof lng === 'number') aqiLng = lng;
    const locEl = document.getElementById('aqiLocation');
    if (locEl) locEl.textContent = `（${aqiPlace}）`;
}

// 计算下一个对齐到15分钟的时间点
function getNextQuarter(now = new Date()) {
    const next = new Date(now);
    const m = next.getMinutes();
    const nextMinutes = Math.ceil((m + 1) / 15) * 15;
    next.setMinutes(nextMinutes);
    next.setSeconds(0);
    next.setMilliseconds(0);
    return next;
}

function formatTimeShort(d) {
    if (!d) return '--:--';
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
}

function updateAqiUpdatedText(lastTime) {
    const aqiUpdatedEl = document.getElementById('aqiUpdated');
    if (!aqiUpdatedEl) return;
    const nextText = nextAqiRefresh ? formatTimeShort(nextAqiRefresh) : '--:--';
    const isEn = document.getElementById('langSwitch') && document.getElementById('langSwitch').textContent === '中文';

    // Use current time as update time for display
    let lastDate = new Date();

    const lastText = lastDate.toLocaleString(isEn ? 'en-US' : 'zh-CN');

    if (isEn) {
        aqiUpdatedEl.textContent = `Updated: ${lastText} · Next: ${nextText}`;
    } else {
        aqiUpdatedEl.textContent = `更新：${lastText} · 下次刷新：${nextText}`;
    }
}

// 安排 AQI 每 15 分钟自动刷新（与最近的 15 分钟对齐）
function scheduleAqiAutoRefresh(lat, lng) {
    // 清理旧的定时器
    if (aqiTimeout) { clearTimeout(aqiTimeout); aqiTimeout = null; }
    if (aqiInterval) { clearInterval(aqiInterval); aqiInterval = null; }

    const now = new Date();
    nextAqiRefresh = getNextQuarter(now);
    const delay = nextAqiRefresh.getTime() - now.getTime();

    // 显示初始下次刷新时间（lastTime not known yet)
    updateAqiUpdatedText(null);

    aqiTimeout = setTimeout(() => {
        showAirQuality(lat, lng);
        // 之后每 15 分钟执行一次
        aqiInterval = setInterval(() => {
            // compute next refresh time for display
            nextAqiRefresh = new Date(Date.now() + 15 * 60 * 1000);
            nextAqiRefresh.setSeconds(0); nextAqiRefresh.setMilliseconds(0);
            showAirQuality(lat, lng);
            updateAqiUpdatedText(new Date().toLocaleString());
        }, 15 * 60 * 1000);
        // set next refresh time displayed (one interval ahead)
        nextAqiRefresh = new Date(Date.now() + 15 * 60 * 1000);
        nextAqiRefresh.setSeconds(0); nextAqiRefresh.setMilliseconds(0);
        updateAqiUpdatedText(new Date().toLocaleString());
    }, delay);
}

// 灾害模拟初始化
function initDisasterSimulation() {
    const setBtn = document.getElementById('setSimulation');
    const randomBtn = document.getElementById('randomSimulation');
    const display = document.getElementById('simulationDisplay');

    const typhoonOptions = ['none', '1', '3', '8se', '8sw', '8ne', '8nw', '9', '10'];
    const windOptions = ['none', '東南', '西南', '東北', '西北'];
    const surgeOptions = ['none', 'blue', 'yellow', 'orange', 'red', 'black'];
    const rainOptions = ['none', 'yellow', 'red', 'black'];

    function updateDisplay() {
        const typhoon = document.getElementById('typhoonLevel').value;
        const wind = document.getElementById('windDirection').value;
        const surge = document.getElementById('stormSurgeLevel').value;
        const rain = document.getElementById('rainstormLevel').value;

        let text = '';
        if (typhoon !== 'none') text += `颱風：${document.getElementById('typhoonLevel').options[document.getElementById('typhoonLevel').selectedIndex].text} `;
        if (wind !== 'none') text += `風向：${wind} `;
        if (surge !== 'none') text += `風暴潮：${document.getElementById('stormSurgeLevel').options[document.getElementById('stormSurgeLevel').selectedIndex].text} `;
        if (rain !== 'none') text += `暴雨：${document.getElementById('rainstormLevel').options[document.getElementById('rainstormLevel').selectedIndex].text}`;
        display.textContent = text || '無災害模擬';
    }

    setBtn.addEventListener('click', updateDisplay);

    randomBtn.addEventListener('click', () => {
        document.getElementById('typhoonLevel').value = typhoonOptions[Math.floor(Math.random() * typhoonOptions.length)];
        document.getElementById('windDirection').value = windOptions[Math.floor(Math.random() * windOptions.length)];
        document.getElementById('stormSurgeLevel').value = surgeOptions[Math.floor(Math.random() * surgeOptions.length)];
        document.getElementById('rainstormLevel').value = rainOptions[Math.floor(Math.random() * rainOptions.length)];
        updateDisplay();
    });
}

// 页面入场动画控制逻辑
function setupIntroAnimation() {
    const overlay = document.getElementById('introOverlay');
    const skipBtn = document.getElementById('skipIntro');
    const container = document.querySelector('.container');

    // 在动画结束后移除覆盖层并显示主容器
    const finishIntro = () => {
        if (!overlay) return;
        overlay.style.display = 'none';
        if (container) container.classList.add('visible');
        // 保证地图尺寸正确
        if (typeof garbageMap !== 'undefined' && garbageMap) garbageMap.invalidateSize();
        // 触发所有小地图 invalidateSize（通过触发窗口 resize）
        window.dispatchEvent(new Event('resize'));
    };

    // 不自动隐藏，等待用户选择模式
    // 这里保留 Esc 键作为快速进入垃圾分佈模式的备用方式
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') selectMode('distribution');
    });
}

function setupModeSelection() {
    const cameraBtn = document.getElementById('cameraModeBtn');
    const distributionBtn = document.getElementById('distributionModeBtn');
    if (cameraBtn) cameraBtn.addEventListener('click', () => selectMode('recognition'));
    if (distributionBtn) distributionBtn.addEventListener('click', () => selectMode('distribution'));
}

function selectMode(mode) {
    const overlay = document.getElementById('introOverlay');
    const container = document.querySelector('.container');
    const cameraSection = document.querySelector('.camera-section');

    if (!overlay || !container) return;

    if (mode === 'recognition') {
        if (cameraSection) cameraSection.style.display = '';
        container.classList.remove('full-width');
        bindCameraEvents();
    } else {
        if (cameraSection) cameraSection.style.display = 'none';
        container.classList.add('full-width');
    }

    overlay.style.display = 'none';
    container.classList.add('visible');
    if (typeof garbageMap !== 'undefined' && garbageMap) garbageMap.invalidateSize();
    window.dispatchEvent(new Event('resize'));
}

// 热力图切换功能（Leaflet 热力图插件示例，需引入 heatmap.js 或 leaflet-heat）
let heatLayer = null;
function setupHeatmapSwitch() {
    const btn = document.getElementById("heatmapSwitch");
    btn.addEventListener("click", () => {
        if (!garbageMap) return;
        if (heatLayer) {
            garbageMap.removeLayer(heatLayer);
            heatLayer = null;
            btn.textContent = "切换热力图";
        } else {
            // 构造热力图数据，根据类型设置权重（有害垃圾影响大，大型垃圾次之）
            const typeWeights = { 'can': 3, 'large': 2, 'person': 1, 'bottle': 1, 'tin can': 1 };
            const points = garbageData.map(g => [g.lat, g.lng, (g.count || 1) * (typeWeights[g.type] || 1)]);
            if (points.length === 0) return;
            // 引入 leaflet-heat 插件
            heatLayer = L.heatLayer(points, {radius: 25, blur: 18, maxZoom: 17}).addTo(garbageMap);
            btn.textContent = "关闭热力图";
        }
    });
}

// 多语言切换（中英文，简单切换页面文本）
function setupLangSwitch() {
    const btn = document.getElementById("langSwitch");
    if (!btn) return;
    let isEn = false;
    btn.addEventListener("click", () => {
        isEn = !isEn;
        btn.textContent = isEn ? "中文" : "English";

        // Helper to safely set text when element exists
        const safeSet = (selOrEl, text) => {
            let el = null;
            if (typeof selOrEl === 'string') el = document.querySelector(selOrEl);
            else el = selOrEl;
            if (el) el.textContent = text;
        };

        // Document title
        document.title = isEn ? "Garbage Search" : "垃刻搜圾";

        // Camera section title and hint
        safeSet('.camera-section h2', isEn ? 'Garbage Recognition' : '垃圾拍攝與識別');
        const cameraHint = document.querySelector('#main span');
        if (cameraHint) cameraHint.textContent = isEn ? "Please center the garbage and click 'Recognize'" : "请将垃圾置于摄像头中央，点击\"拍摄识别\"自动分析";

        // Heatmap / import / export buttons
        const heatBtn = document.getElementById('heatmapSwitch'); if (heatBtn) heatBtn.textContent = isEn ? 'Toggle Heatmap' : '切换热力图';
        const importBtn = document.getElementById('importBtn'); if (importBtn) importBtn.textContent = isEn ? 'Import Data (CSV)' : '匯入垃圾資料（CSV）';
        const exportBtn = document.getElementById('exportData'); if (exportBtn) exportBtn.textContent = isEn ? 'Export Data (CSV)' : '匯出垃圾資料（CSV）';

        // Map section title and hint
        safeSet('#map h2', isEn ? 'Garbage Map' : '垃圾佈點地圖');
        const mapHint = document.querySelector('#map span'); if (mapHint) mapHint.textContent = isEn ? 'You can add points by filter, random or clicking the map' : '可通過篩選、隨機定位或手動點擊地圖添加垃圾點';

        // Cyclone / Flood titles — prefer toggling lang spans; fallback: safeSet
        const cycloneTitleZh = document.querySelector('#cycloneInfo .lang-zh');
        const cycloneTitleEn = document.querySelector('#cycloneInfo .lang-en');
        if (cycloneTitleZh && cycloneTitleEn) { cycloneTitleZh.style.display = isEn ? 'none' : 'inline'; cycloneTitleEn.style.display = isEn ? 'inline' : 'none'; }
        else safeSet('#cycloneInfo h3', isEn ? 'Pacific Tropical Cyclone Activity (Live Summary)' : '太平洋热带气旋活动（实时摘要）');

        const floodTitleZh = document.querySelector('#floodInfo .lang-zh');
        const floodTitleEn = document.querySelector('#floodInfo .lang-en');
        if (floodTitleZh && floodTitleEn) { floodTitleZh.style.display = isEn ? 'none' : 'inline'; floodTitleEn.style.display = isEn ? 'inline' : 'none'; }
        else safeSet('#floodInfo h3', isEn ? 'Global Flooding Overview' : '全球洪涝/水灾概况');

        // Alert block
        const alertStrong = document.querySelector('#alertInfo strong');
        if (alertStrong) alertStrong.textContent = isEn ? 'Disaster Alert:' : '灾害预警：';

        // Weather text
        const weatherTextEl = document.getElementById('weatherText'); if (weatherTextEl) weatherTextEl.textContent = isEn ? 'Getting weather info...' : '正在获取天气信息...';

        // Toggle all inline lang blocks
        const langsZh = document.querySelectorAll('.lang-zh');
        const langsEn = document.querySelectorAll('.lang-en');
        langsZh.forEach(el => { if (el) el.style.display = isEn ? 'none' : 'inline'; });
        langsEn.forEach(el => { if (el) el.style.display = isEn ? 'inline' : 'none'; });

        // Navigation links (safe mapping)
        const navLinks = Array.from(document.querySelectorAll('nav a'));
        const navText = isEn ? ['Garbage Search', 'Recognition', 'Map', '7-Day Forecast', 'Disaster Simulation', 'Shelters', 'Disaster Response Tips'] : ['垃刻搜圾', '垃圾識別', '地圖佈點', '未來七日天氣', '災害模擬', '避險中心', '災害應對要點'];
        navLinks.forEach((a, i) => { if (a && navText[i]) a.textContent = navText[i]; });

        // Camera control buttons
        const startBtn = document.getElementById('startCamera'); if (startBtn) startBtn.textContent = isEn ? 'Start Camera' : '开启摄像头';
        const captureBtn = document.getElementById('capturePhoto'); if (captureBtn) captureBtn.textContent = isEn ? 'Recognize' : '拍摄识别';
        const resetBtn = document.getElementById('resetCamera'); if (resetBtn) resetBtn.textContent = isEn ? 'Reset' : '重置';

        // Map filter labels — safely replace text nodes
        const filterLabels = Array.from(document.querySelectorAll('.filter label'));
        const filterText = isEn ? ['Person', 'Bottle', 'Can', 'Tin Can', 'Large'] : ['可回收物', '厨余垃圾', '有害垃圾', '其他垃圾', '大型垃圾'];
        filterLabels.forEach((label, i) => {
            if (!label) return;
            // Find text nodes in label
            const textNodes = Array.from(label.childNodes).filter(n => n.nodeType === Node.TEXT_NODE);
            if (textNodes.length > 0) {
                textNodes[0].nodeValue = ' ' + (filterText[i] || textNodes[0].nodeValue.trim());
            } else {
                // append text if none
                label.appendChild(document.createTextNode(' ' + (filterText[i] || '')));
            }
        });

        // Re-render seven-day forecast to update weekday language
        try {
            let lat = 30.67, lng = 104.06;
            if (typeof garbageMap !== 'undefined' && garbageMap && garbageMap.getCenter) {
                const c = garbageMap.getCenter();
                if (c && c.lat && c.lng) { lat = c.lat; lng = c.lng; }
            }
            showSevenDayForecast(lat, lng);
        } catch (e) {
            // ignore
        }
    });
}

// 灾害预警自动获取与显示（示例用中国气象局台风预警API，可替换为全球灾害API）
function showDisasterAlert() {
    const alertInfo = document.getElementById("alertInfo");
    const alertText = document.getElementById("alert")
    fetch("https://api.shequ123.com/disaster/alerts")
        .then(res => res.json())
        .then(data => {
            if (data && data.length) {
                alertInfo.style.display = "block";
                alertText.textContent = data.map(a => a.title + (a.level ? `（${a.level}）` : "")).join("；");
            } else {
                alertInfo.style.display = "none";
            }
        })
        .catch(() => {
            alertInfo.style.display = "none";
        });
}
// 获取并显示水浸灾害信息（示例：水利部实时水情API，实际可用更权威数据源）
function showFloods() {
    const floodList = document.getElementById("floodList");
    const floodUpdated = document.getElementById('floodUpdated');
    // FloodList 全球水灾API（返回JSON，包含全球近期水灾）
    fetch("https://www.floodlist.com/rss/world.json")
        .then(res => res.json())
        .then(data => {
            if (!data || !data.items || !data.items.length) {
                floodList.textContent = "当前未检索到显著洪涝事件。";
                if (floodUpdated) floodUpdated.textContent = `最后更新：${new Date().toLocaleString()}`;
                return;
            }
            floodList.innerHTML = data.items.map(f => {
                return `<div style='margin-bottom:8px;'><strong>${f.title}</strong>：${f.description || ""}<br><span style='color:#888;'>${f.pubDate}</span></div>`;
            }).join("");
            if (floodUpdated) floodUpdated.textContent = `最后更新：${new Date().toLocaleString()}`;
        })
        .catch(() => {
            floodList.textContent = "全球水灾信息获取失败，请检查网络或数据源。";
            const floodUpdated = document.getElementById('floodUpdated');
            if (floodUpdated) floodUpdated.textContent = `更新失败：${new Date().toLocaleString()}`;
        });
}
// 获取并显示当前太平洋气旋（NOAA API，西太平洋/中太平洋）
function showCyclones() {
    const cycloneList = document.getElementById("cycloneList");
    const cycloneUpdated = document.getElementById('cycloneUpdated');
    // NOAA西太平洋气旋（TCs）API，返回JSON格式
    // 这里用 NOAA NHC 的活跃气旋数据（东太/中太/西太）
    fetch("https://www.nhc.noaa.gov/CurrentStorms.json")
        .then(res => res.json())
        .then(data => {
            // 过滤太平洋气旋
            const pacificCyclones = (data.active || []).filter(
                c => c.basin && (c.basin.includes("EP") || c.basin.includes("CP") || c.basin.includes("WP"))
            );
            if (pacificCyclones.length === 0) {
                cycloneList.textContent = "当前太平洋无活动性热带气旋（TC）。";
                if (cycloneUpdated) cycloneUpdated.textContent = `最后更新：${new Date().toLocaleString()}`;
                return;
            }
            cycloneList.innerHTML = pacificCyclones.map(c => {
                const name = c.name || "未命名";
                const basin = c.basin || "";
                const type = c.type || "热带气旋";
                const adv = c.adv || "";
                // 输出更专业的摘要：名称、基线（基于命名代理）、当前位置/发布的最新通报片段
                return `<div style='margin-bottom:8px;'><strong>${name}</strong> <span style='color:#666;'>(${type} — ${basin})</span><div style='margin-top:6px;color:#333;'>${adv}</div></div>`;
            }).join("");
            if (cycloneUpdated) cycloneUpdated.textContent = `最后更新：${new Date().toLocaleString()}`;
        })
        .catch(() => {
            cycloneList.textContent = "气旋信息获取失败，请检查数据源或网络连接。";
            if (cycloneUpdated) cycloneUpdated.textContent = `更新失败：${new Date().toLocaleString()}`;
        });
}
// 实时天气与气温显示（成都为例，可根据地图中心点动态获取）
function showWeather() {
    const weatherText = document.getElementById("weatherText");
    const weatherIcon = document.getElementById("weatherIcon");
    // 优先使用主地图中心（如果已初始化），否则回退到成都经纬度
    let lat = 30.67;
    let lng = 104.06;
    try {
        if (typeof garbageMap !== 'undefined' && garbageMap && garbageMap.getCenter) {
            const c = garbageMap.getCenter();
            if (c && c.lat && c.lng) {
                lat = c.lat;
                lng = c.lng;
            }
        }
    } catch (e) {
        // ignore and use default
    }
    // open-meteo 免费API
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&hourly=temperature_2m,weathercode`)
        .then(res => res.json())
        .then(data => {
            if (!data.current_weather) {
                weatherText.textContent = "天气信息获取失败";
                return;
            }
            const temp = data.current_weather.temperature;
            const code = data.current_weather.weathercode;
            // 简单天气图标与描述
            const weatherMap = {
                0: { icon: "☀️", text: "晴" },
                1: { icon: "🌤️", text: "多云" },
                2: { icon: "⛅", text: "间歇多云" },
                3: { icon: "☁️", text: "阴" },
                45: { icon: "🌫️", text: "雾" },
                48: { icon: "🌫️", text: "雾" },
                51: { icon: "🌦️", text: "小雨" },
                53: { icon: "🌦️", text: "中雨" },
                55: { icon: "🌧️", text: "大雨" },
                61: { icon: "🌦️", text: "阵雨" },
                63: { icon: "🌧️", text: "中阵雨" },
                65: { icon: "🌧️", text: "强阵雨" },
                80: { icon: "🌦️", text: "雷阵雨" },
                95: { icon: "⛈️", text: "雷暴" },
                99: { icon: "⛈️", text: "强雷暴" }
            };
            const weather = weatherMap[code] || { icon: "❓", text: "未知" };
            weatherIcon.textContent = weather.icon;
            weatherText.textContent = `当前气温：${temp}℃，天气：${weather.text}`;
            // 调用七日预报与今日/整点实况（使用同一坐标或主地图中心）
            showSevenDayForecast(lat, lng);
            showTodayAndHourly(lat, lng);
        })
        .catch(() => {
            weatherText.textContent = "天气信息获取失败";
        });
}
// 6. 随机定位垃圾功能
function bindRandomGarbageEvent() {
    const randomBtn = document.getElementById("randomGarbage");
    randomBtn.addEventListener("click", () => {
        // 获取当前地图边界
        const bounds = garbageMap.getBounds();
        const latMin = bounds.getSouthWest().lat;
        const latMax = bounds.getNorthEast().lat;
        const lngMin = bounds.getSouthWest().lng;
        const lngMax = bounds.getNorthEast().lng;

        // 随机生成经纬度
        const lat = Math.random() * (latMax - latMin) + latMin;
        const lng = Math.random() * (lngMax - lngMin) + lngMin;

        // 随机类型（玻璃、金属、塑料、垃圾、厨余垃圾、有害垃圾、大型垃圾）
        const types = [
            { key: "Glass", name: "玻璃" },
            { key: "Metal", name: "金属" },
            { key: "Plastic", name: "塑料" },
            { key: "Trash", name: "垃圾" },
            { key: "Kitchen", name: "厨余垃圾" },
            { key: "Hazardous", name: "有害垃圾" },
            { key: "Large", name: "大型垃圾" }
        ];
        const randomType = types[Math.floor(Math.random() * types.length)];

        // 随机数量 1~5
        const count = Math.floor(Math.random() * 5) + 1;

        const typeCodeMap = { Glass: 1, Metal: 2, Plastic: 3, Trash: 4, Kitchen: 5, Hazardous: 6, Large: 7 };
        // 构造对象
        const garbage = {
            id: Date.now(),
            type: randomType.key,
            typeName: randomType.name,
            typeCode: typeCodeMap[randomType.key] || 0,
            lat,
            lng,
            count,
            time: new Date().toLocaleString()
        };

        garbageData.push(garbage);
        addGarbageMarker(garbage);
    });
}

// 1. 初始化Leaflet地图（默认中心点设为模拟灾难点，可自行修改经纬度）
function initMap() {
    garbageMap = L.map("garbageMap").setView([22.1987, 113.5439], 14); // 澳门经纬度
    
    // 加载OpenStreetMap底图
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(garbageMap);

    // 监听地图点击：手动添加（玻璃、金属、塑料、垃圾、厨余垃圾、有害垃圾、大型垃圾）
    garbageMap.on("click", (e) => {
        const type = prompt("请选择类型：1.玻璃 2.金属 3.塑料 4.垃圾 5.厨余垃圾 6.有害垃圾 7.大型垃圾", "1");
        if (!type || !["1", "2", "3", "4", "5", "6", "7"].includes(type)) return;
        const typeMap = { "1": "Glass", "2": "Metal", "3": "Plastic", "4": "Trash", "5": "Kitchen", "6": "Hazardous", "7": "Large" };
        const typeName = { "1": "玻璃", "2": "金属", "3": "塑料", "4": "垃圾", "5": "厨余垃圾", "6": "有害垃圾", "7": "大型垃圾" };
        const typeCodeMap = { Glass: 1, Metal: 2, Plastic: 3, Trash: 4, Kitchen: 5, Hazardous: 6, Large: 7 };
        const garbage = {
            id: Date.now(),
            type: typeMap[type],
            typeName: typeName[type],
            typeCode: typeCodeMap[typeMap[type]] || 0,
            lat: e.latlng.lat,
            lng: e.latlng.lng,
            count: 1,
            time: new Date().toLocaleString()
        };
        garbageData.push(garbage);
        addGarbageMarker(garbage);
    });
}

// 2. 绑定摄像头相关事件
function bindCameraEvents() {
    const startBtn = document.getElementById("startCamera");
    const captureBtn = document.getElementById("capturePhoto");
    const resetBtn = document.getElementById("resetCamera");
    const preview = document.getElementById("cameraPreview");
    const canvas = document.getElementById("captureCanvas");
    const resultDiv = document.getElementById("recognitionResult");

    // 开启摄像头
    startBtn.addEventListener("click", async () => {
        try {
            // 获取摄像头流（优先后置摄像头）
            cameraStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" }
            });
            preview.srcObject = cameraStream;
            startBtn.disabled = true;
            captureBtn.disabled = false;
            resetBtn.disabled = false;
        } catch (err) {
            resultDiv.textContent = `摄像头开启失败：${err.message}`;
            resultDiv.style.color = "red";
        }
    });

    // 拍摄并识别垃圾
    captureBtn.addEventListener("click", async () => {
        // 从摄像头预览截图到画布
        const ctx = canvas.getContext("2d");
        canvas.width = preview.videoWidth;
        canvas.height = preview.videoHeight;
        ctx.drawImage(preview, 0, 0, canvas.width, canvas.height);

        // 上传到后端进行识别（云端识别）
        canvas.toBlob(async (blob) => {
            try {
                resultDiv.textContent = "正在识别垃圾...";
                const formData = new FormData();
                formData.append("file", blob, "garbage.jpg");
                const response = await fetch("http://localhost:8000/detect-garbage", {
                    method: "POST",
                    body: formData
                });
                if (!response.ok) throw new Error("识别请求失败");
                const result = await response.json();
                if (result.garbage_total.length === 0) {
                    resultDiv.textContent = "未识别到垃圾";
                    return;
                }
                // 只处理可回收物、厨余垃圾、有害垃圾、其他垃圾、大型垃圾
                const allowedTypes = ["person", "bottle", "can", "tin can", "large"];
                let found = false;
                result.garbage_total.forEach(item => {
                    if (allowedTypes.includes(item.type)) {
                        const typeMap = {
                            "person": "Glass",
                            "bottle": "Plastic",
                            "can": "Metal",
                            "tin can": "Trash",
                            "large": "Large"
                        };
                        const typeNameMap = {
                            "Glass": "玻璃",
                            "Metal": "金属",
                            "Plastic": "塑料",
                            "Trash": "垃圾",
                            "Kitchen": "厨余垃圾",
                            "Hazardous": "有害垃圾",
                            "Large": "大型垃圾"
                        };
                        const typeCodeMap = { Glass: 1, Metal: 2, Plastic: 3, Trash: 4, Kitchen: 5, Hazardous: 6, Large: 7 };
                        const center = garbageMap.getCenter();
                        const finalType = typeMap[item.type] || "Trash";
                        const markerObj = {
                            id: Date.now(),
                            type: finalType,
                            typeName: typeNameMap[finalType],
                            typeCode: typeCodeMap[finalType],
                            lat: center.lat,
                            lng: center.lng,
                            count: item.count,
                            time: new Date().toLocaleString()
                        };
                        resultDiv.textContent = `识别结果：${markerObj.typeName}，数量：${markerObj.count}，时间：${markerObj.time}`;
                        resultDiv.style.color = "green";
                        garbageData.push(markerObj);
                        addGarbageMarker(markerObj);
                        found = true;
                    }
                });
                if (!found) {
                    resultDiv.textContent = "未识别到指定类别";
                }
            } catch (err) {
                resultDiv.textContent = `识别失败：${err.message}`;
                resultDiv.style.color = "red";
            }
        }, "image/jpeg");
    });

    // 重置摄像头
    resetBtn.addEventListener("click", () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            preview.srcObject = null;
        }
        startBtn.disabled = false;
        captureBtn.disabled = true;
        resetBtn.disabled = true;
        resultDiv.textContent = "";
    });
}

// 3. 添加垃圾标注到地图
function addGarbageMarker(garbage) {
    // 定义大类映射：子类 -> 大类 + 编号
    const categoryMap = {
        Glass: { main: "可回收物", sub: "玻璃", code: 1 },
        Metal: { main: "可回收物", sub: "金属", code: 2 },
        Plastic: { main: "可回收物", sub: "塑料", code: 3 },
        Trash: { main: "其他垃圾", sub: "垃圾", code: 4 },
        Kitchen: { main: "厨余垃圾", sub: "厨余垃圾", code: 5 },
        Hazardous: { main: "有害垃圾", sub: "有害垃圾", code: 6 },
        Large: { main: "大型垃圾", sub: "大型垃圾", code: 7 }
    };

    const category = categoryMap[garbage.type] || { main: "未知", sub: "未知", code: 0 };

    // 图标按大类显示
    const iconMap = {
        "可回收物": '♻️',
        "厨余垃圾": '🍌',
        "有害垃圾": '⚠️',
        "其他垃圾": '🗑️',
        "大型垃圾": '🏗️'
    };
    const iconHtml = iconMap[category.main] || '❓';

    const icon = L.divIcon({
        html: iconHtml,
        className: 'garbage-icon',
        iconSize: [40, 40], // 图标大小
        iconAnchor: [20, 40], // 锚点位置（底部居中）
        popupAnchor: [0, -40] // 弹窗位置
    });

    // 创建标注并添加到地图
    const marker = L.marker([garbage.lat, garbage.lng], { icon: icon })
        .addTo(garbageMap)
        .bindPopup(`
            <div style="font-size:14px;">
                <p><strong>大类：</strong>${category.main}</p >
                <p><strong>具体类型：</strong>${category.sub}</p >
                <p><strong>类型编号：</strong>${category.code}</p >
                <p><strong>数量：</strong>${garbage.count}</p >
                <p><strong>时间：</strong>${garbage.time}</p >
                <p><strong>坐标：</strong>(${garbage.lat.toFixed(4)}, ${garbage.lng.toFixed(4)})</p >
            </div>
        `);

    // 存储标注到垃圾数据（用于后续筛选）
    garbage.marker = marker;
}

// 4. 垃圾类型筛选（显示/隐藏对应标注）
function bindFilterEvents() {
    const checkboxes = document.querySelectorAll(".filter input");
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener("change", () => {
            const checkedTypes = Array.from(checkboxes)
                .filter(cb => cb.checked)
                .map(cb => cb.value);
            
            // 遍历所有垃圾数据，显示/隐藏标注（按大类筛选）
            garbageData.forEach(garbage => {
                const categoryMap = {
                    Glass: "可回收物", Metal: "可回收物", Plastic: "可回收物",
                    Trash: "其他垃圾", Kitchen: "厨余垃圾", Hazardous: "有害垃圾", Large: "大型垃圾"
                };
                const mainCategory = categoryMap[garbage.type] || "未知";
                if (checkedTypes.includes(mainCategory)) {
                    garbageMap.addLayer(garbage.marker);
                } else {
                    garbageMap.removeLayer(garbage.marker);
                }
            });
        });
    });
}

// 5. 导出垃圾数据为CSV
function bindExportEvent() {
    const exportBtn = document.getElementById("exportData");
    exportBtn.addEventListener("click", () => {
        if (garbageData.length === 0) {
            alert("暂无垃圾数据可导出");
            return;
        }

        // 构造CSV内容
        const header = "ID,垃圾类型,纬度,经度,数量,记录时间\n";
        const rows = garbageData.map(garbage => 
            `${garbage.id},${garbage.typeName},${garbage.lat},${garbage.lng},${garbage.count},${garbage.time}`
        ).join("\n");
        const csvContent = header + rows;

        // 创建下载链接
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `灾后垃圾数据_${new Date().toLocaleDateString()}.csv`;
        a.click();
        URL.revokeObjectURL(url); // 释放URL
    });
}

// 6. 导入垃圾数据从CSV
function bindImportEvent() {
    const importBtn = document.getElementById("importBtn");
    const importData = document.getElementById("importData");
    importBtn.addEventListener("click", () => {
        importData.click();
    });
    importData.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const csv = evt.target.result;
            const lines = csv.split('\n');
            if (lines.length < 2) return;
            lines.slice(1).forEach(line => {
                if (!line.trim()) return;
                const cols = line.split(',');
                if (cols.length >= 6) {
                    const typeMap = {
                        "玻璃": "Glass",
                        "金属": "Metal",
                        "塑料": "Plastic",
                        "垃圾": "Trash",
                        "厨余垃圾": "Kitchen",
                        "有害垃圾": "Hazardous",
                        "大型垃圾": "Large",
                        "可回收物": "Glass",  // 兼容旧CSV数据
                        "不可回收物": "Trash"
                    };
                    const typeCodeMap = { Glass: 1, Metal: 2, Plastic: 3, Trash: 4, Kitchen: 5, Hazardous: 6, Large: 7 };
                    const finalType = typeMap[cols[1]] || "Trash";
                    const garbage = {
                        id: parseInt(cols[0]),
                        type: finalType,
                        typeName: cols[1],
                        typeCode: typeCodeMap[finalType] || 0,
                        lat: parseFloat(cols[2]),
                        lng: parseFloat(cols[3]),
                        count: parseInt(cols[4]),
                        time: cols[5]
                    };
                    garbageData.push(garbage);
                    addGarbageMarker(garbage);
                }
            });
        };
        reader.readAsText(file);
    });
}

// 初始化多个城市地图（小地图预览）
function initCityMaps() {
    // 按大洲分组的城市经纬度中心点
    const continents = {
        asia: [
            { id: 'map-shanghai', name: '花地瑪堂區', lat: 22.208067, lng: 113.552284 },
            { id: 'map-beijing', name: '聖安多尼堂區', lat: 22.199207, lng: 113.548961 },
            { id: 'map-guangzhou', name: '大堂區', lat: 22.189307, lng: 113.543228 },
            { id: 'map-shenzhen', name: '望德堂區', lat: 22.202511, lng: 113.561514 },
            { id: 'map-tokyo', name: '风顺堂区', lat: 22.192278, lng: 113.561514 },
            { id: 'map-seoul', name: '首尔', lat: 37.5665, lng: 126.9780 },
            { id: 'map-manila', name: '马尼拉', lat: 14.5995, lng: 120.9842 },
            { id: 'map-newdelhi', name: '新德里', lat: 28.6139, lng: 77.2090 }
        ],
        europe: [
            { id: 'map-paris', name: '嘉模堂區', lat: 22.15972, lng: 113.55944 },
            { id: 'map-lisbon', name: '路氹城', lat: 22.13917, lng: 113.55722 },
            { id: 'map-florence', name: '聖方濟各堂區', lat: 22.1264, lng: 113.5709 },
            { id: 'map-london', name: '伦敦', lat: 51.5074, lng: -0.1278 },
            { id: 'map-madrid', name: '马德里', lat: 40.4168, lng: -3.7038 },
            { id: 'map-moscow', name: '莫斯科', lat: 55.7558, lng: 37.6173 },
            { id: 'map-reykjavik', name: '雷克雅未克', lat: 64.1466, lng: -21.9426 },
            { id: 'map-helsinki', name: '赫尔辛基', lat: 60.1699, lng: 24.9384 },
            { id: 'map-oslo', name: '奥斯陆', lat: 59.9139, lng: 10.7522 }
        ],
        oceania: [
            { id: 'map-sydney', name: '澳門大學橫琴校區', lat: 22.126188, lng: 113.548951 },
            { id: 'map-wellington', name: '新城A區', lat: 22.205474, lng: 113.570029 }
        ],
        northamerica: [
            { id: 'map-newyork', name: '路氹城', lat: 22.13917, lng: 113.55722 },
            { id: 'map-losangeles', name: '洛杉矶', lat: 34.0522, lng: -118.2437 },
            { id: 'map-seattle', name: '西雅图', lat: 47.6062, lng: -122.3321 },
            { id: 'map-ottawa', name: '渥太华', lat: 45.4215, lng: -75.6972 },
            { id: 'map-mexicocity', name: '墨西哥城', lat: 19.4326, lng: -99.1332 },
            { id: 'map-toronto', name: '多伦多', lat: 43.651070, lng: -79.347015 },
            { id: 'map-chicago', name: '芝加哥', lat: 41.8781, lng: -87.6298 },
            { id: 'map-houston', name: '休斯顿', lat: 29.7604, lng: -95.3698 }
        ],
        southamerica: [
            { id: 'map-buenosaires', name: '布宜诺斯艾利斯', lat: -34.6037, lng: -58.3816 },
            { id: 'map-brasilia', name: '巴西利亚', lat: -15.8267, lng: -47.9218 },
            { id: 'map-sao_paulo', name: '圣保罗', lat: -23.5505, lng: -46.6333 },
            { id: 'map-santiago', name: '圣地亚哥', lat: -33.4489, lng: -70.6693 },
            { id: 'map-lima', name: '利马', lat: -12.0464, lng: -77.0428 },
            { id: 'map-bogota', name: '波哥大', lat: 4.7110, lng: -74.0721 }
        ]
    };

    // 遍历每个大洲和城市初始化地图
    Object.keys(continents).forEach(cont => {
        continents[cont].forEach(city => {
            try {
                const m = L.map(city.id, { zoomControl: false, attributionControl: false }).setView([city.lat, city.lng], 12);
                L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                    attribution: "&copy; OpenStreetMap contributors"
                }).addTo(m);

                const marker = L.marker([city.lat, city.lng]).addTo(m).bindPopup(`<strong>${city.name}</strong>`);
                marker.openPopup();
                m.scrollWheelZoom.disable();
                window.addEventListener('resize', () => m.invalidateSize());
            } catch (e) {
                console.error('初始化城市地图失败：', city.id, e);
            }
        });
    });
}

// 显示未来七日天气（使用 open-meteo 免费 API）
function showSevenDayForecast(lat, lng) {
    const container = document.getElementById('forecastCards');
    if (!container) return;
    container.textContent = '正在加载七日天气...';

    // 请求 daily 温度与天气代码
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`;
    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (!data || !data.daily) {
                container.textContent = '天气预报获取失败';
                return;
            }
            const days = data.daily.time || [];
            const tmax = data.daily.temperature_2m_max || [];
            const tmin = data.daily.temperature_2m_min || [];
            const codes = data.daily.weathercode || [];

            // 简单天气图标映射
            const iconMap = {
                0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️',
                51: '🌦️', 53: '🌦️', 55: '🌧️', 61: '🌦️', 63: '🌧️', 65: '🌧️',
                80: '🌦️', 95: '⛈️', 99: '⛈️'
            };

            const isEn = document.getElementById('langSwitch') && document.getElementById('langSwitch').textContent === '中文';

            const cards = days.map((d, i) => {
                const date = new Date(d);
                const weekday = date.toLocaleDateString(isEn ? 'en-US' : 'zh-CN', { weekday: 'short' });
                const icon = iconMap[codes[i]] || '❓';
                return `
                    <div class="forecast-card">
                        <div class="day">${weekday}</div>
                        <div class="icon">${icon}</div>
                        <div class="temp">${Math.round(tmax[i])}° / ${Math.round(tmin[i])}°</div>
                    </div>
                `;
            }).join('');

            container.innerHTML = cards;
        })
        .catch(() => {
            container.textContent = '天气预报获取失败';
        });
}

// 今日预测与整点实况
function showTodayAndHourly(lat, lng) {
    const todayEl = document.getElementById('todaySummary');
    const hourlyEl = document.getElementById('hourlyNow');
    if (!todayEl || !hourlyEl) return;
    todayEl.textContent = '加载中...';
    hourlyEl.textContent = '';

    // 请求小时数据：temperature_2m, weathercode, precipitation, windspeed_10m
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,weathercode,precipitation,windspeed_10m&timezone=auto`;
    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (!data || !data.hourly) {
                todayEl.textContent = '今日实况获取失败';
                return;
            }

            const now = new Date();
            const timezone = data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

            // find today's hours
            const times = data.hourly.time || [];
            const temps = data.hourly.temperature_2m || [];
            const codes = data.hourly.weathercode || [];
            const prec = data.hourly.precipitation || [];
            const wind = data.hourly.windspeed_10m || [];

            // Summary for today: min/max temp and total precipitation
            // compute for dates equal to today in local timezone
            const todayStr = now.toISOString().slice(0,10);
            let tmin = Infinity, tmax = -Infinity, totalPrec = 0;
            const hourlyCards = [];

            times.forEach((t, i) => {
                if (t.startsWith(todayStr)) {
                    const temp = temps[i];
                    const code = codes[i];
                    const p = prec[i] || 0;
                    const w = wind[i] || 0;
                    tmin = Math.min(tmin, temp);
                    tmax = Math.max(tmax, temp);
                    totalPrec += p;

                    // hour display localized
                    const dt = new Date(t);
                    const hourLabel = dt.toLocaleTimeString(undefined, {hour: '2-digit', minute: '2-digit'});
                    const iconMap = {0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',48:'🌫️',51:'🌦️',53:'🌦️',55:'🌧️',61:'🌦️',63:'🌧️',65:'🌧️',80:'🌦️',95:'⛈️',99:'⛈️'};
                    const icon = iconMap[code] || '❓';

                    hourlyCards.push(`<div class="hourly-card"><div class="time">${hourLabel}</div><div class="icon">${icon}</div><div class="val">${Math.round(temp)}°</div><div style="font-size:11px;color:#666;">${Math.round(p*10)/10}mm</div></div>`);
                }
            });

            if (tmin===Infinity) {
                todayEl.textContent = '今日数据不足';
            } else {
                todayEl.innerHTML = `<strong><span class=\"lang-zh\">今日</span><span class=\"lang-en\" style=\"display:none\">Today</span></strong>： ${Math.round(tmin)}° ~ ${Math.round(tmax)}°，<span class=\"lang-zh\">降水</span><span class=\"lang-en\" style=\"display:none\">Precip.</span> ${Math.round(totalPrec*10)/10} mm`;
            }

            hourlyEl.innerHTML = hourlyCards.join('') || '今日无小时数据';

            // 语言切换时也要显示正确语言（确保 lang blocks 同步）
            const langsZh = document.querySelectorAll('.lang-zh');
            const langsEn = document.querySelectorAll('.lang-en');
            const isEn = document.getElementById('langSwitch') && document.getElementById('langSwitch').textContent === '中文';
            langsZh.forEach(el => el.style.display = isEn ? 'none' : 'inline');
            langsEn.forEach(el => el.style.display = isEn ? 'inline' : 'none');
        })
        .catch(() => {
            todayEl.textContent = '今日实况获取失败';
            hourlyEl.textContent = '整点实况获取失败';
        });
}

// 实时空气质量显示（简单实现基于 PM2.5/PM10）
function showAirQuality(lat, lng) {
    const aqiValueEl = document.getElementById('aqiValue');
    const aqiCatEl = document.getElementById('aqiCategory');
    const aqiDetailsEl = document.getElementById('aqiDetails');
    const aqiUpdatedEl = document.getElementById('aqiUpdated');
    // update displayed location name if present
    const locEl = document.getElementById('aqiLocation');
    if (locEl) locEl.textContent = `（${aqiPlace}）`;
    if (!aqiValueEl || !aqiCatEl || !aqiDetailsEl) return;

    aqiValueEl.textContent = '--';
    aqiCatEl.textContent = document.querySelector('.lang-zh') ? '正在获取中...' : 'Loading...';

    // 使用 WAQI API for Macau air quality
    const url = `https://api.waqi.info/feed/macau/?token=4785be414cf9e8c69bc5ff3a40ad470028c23eac`;
    fetch(url)
        .then(res => res.json())
        .then(data => {
            // WAQI data
            if (!data || data.status !== 'ok' || !data.data) {
                aqiCatEl.textContent = '空气质量数据不可用';
                return;
            }

            const aqi = data.data.aqi || 0;
            const iaqi = data.data.iaqi || {};
            const latestPm25 = iaqi.pm25 ? iaqi.pm25.v : 0;
            const latestPm10 = iaqi.pm10 ? iaqi.pm10.v : 0;

            // AQI 分级（中国标准）：
            // 0-50 优, 51-100 良, 101-150 轻度污染, 151-200 中度污染, 201-300 重度污染, 301+ 严重污染
            let category = '优';
            let cls = 'aqi-good';
            if (aqi <= 50) { category = '优'; cls = 'aqi-good'; }
            else if (aqi <= 100) { category = '良'; cls = 'aqi-moderate'; }
            else if (aqi <= 150) { category = '轻度污染'; cls = 'aqi-bad'; }
            else if (aqi <= 200) { category = '中度污染'; cls = 'aqi-bad'; }
            else if (aqi <= 300) { category = '重度污染'; cls = 'aqi-bad'; }
            else { category = '严重污染'; cls = 'aqi-bad'; }

            // English mapping
            const isEn = document.getElementById('langSwitch') && document.getElementById('langSwitch').textContent === '中文';
            const catText = isEn ? (category === '优' ? 'Good' : category === '良' ? 'Moderate' : 'Unhealthy') : category;

            aqiValueEl.textContent = Math.round(aqi);
            aqiValueEl.className = cls;
            aqiCatEl.textContent = catText;
            aqiDetailsEl.textContent = `PM2.5: ${Math.round(latestPm25)} μg/m³ · PM10: ${Math.round(latestPm10)} μg/m³`;
            // Parse API time string into a Date object (fallback to now)
            let lastTimeRaw = times[i];
            let lastDate = lastTimeRaw ? new Date(lastTimeRaw) : new Date();
            if (isNaN(lastDate.getTime())) lastDate = new Date();
            updateAqiUpdatedText(lastDate);
        })
        .catch(() => {
            // keep the previous text
        });
}
