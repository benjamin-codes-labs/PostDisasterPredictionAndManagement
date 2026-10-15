/** Live air quality index for Macau from the World Air Quality Index project. */
import { AQI_REFRESH_INTERVAL_MS, WAQI_FEED_URL, WAQI_TOKEN } from '../config.js';
import { formatDateTime, formatTime, onLanguageChange, t } from '../i18n/index.js';

/** US EPA AQI bands, as reported by WAQI. */
const AQI_LEVELS = [
  { max: 50, id: 'good', tone: 'good' },
  { max: 100, id: 'moderate', tone: 'moderate' },
  { max: 150, id: 'sensitive', tone: 'poor' },
  { max: 200, id: 'unhealthy', tone: 'poor' },
  { max: 300, id: 'veryUnhealthy', tone: 'poor' },
  { max: Infinity, id: 'hazardous', tone: 'poor' },
];

const aqiLevel = (aqi) => AQI_LEVELS.find(({ max }) => aqi <= max);

/** Next wall-clock time aligned to `intervalMs` (e.g. :00, :15, :30, :45 for 15 minutes). */
const nextAlignedTime = (now, intervalMs) => new Date((Math.floor(now.getTime() / intervalMs) + 1) * intervalMs);

export function initAirQuality() {
  const elements = {
    value: document.getElementById('aqi-value'),
    level: document.getElementById('aqi-level'),
    pollutants: document.getElementById('aqi-pollutants'),
    updated: document.getElementById('aqi-updated'),
  };

  let state = { status: 'loading' };
  let nextRefreshAt = null;
  const render = () => renderAirQuality(elements, state, nextRefreshAt);

  async function refresh() {
    try {
      state = { status: 'ready', reading: await fetchAirQuality() };
    } catch (error) {
      console.error('Failed to load air quality', error);
      // Keep showing the last good reading if there is one.
      if (state.status !== 'ready') state = { status: 'error' };
    }
    render();
  }

  function scheduleRefresh() {
    nextRefreshAt = nextAlignedTime(new Date(), AQI_REFRESH_INTERVAL_MS);
    setTimeout(async () => {
      await refresh();
      scheduleRefresh();
    }, nextRefreshAt.getTime() - Date.now());
    render();
  }

  document.getElementById('aqi-refresh').addEventListener('click', refresh);
  onLanguageChange(render);
  scheduleRefresh();
  refresh();
}

async function fetchAirQuality() {
  const url = new URL(WAQI_FEED_URL);
  url.searchParams.set('token', WAQI_TOKEN);

  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const { status, data } = await response.json();
  if (status !== 'ok' || typeof data?.aqi !== 'number') throw new Error('No air quality reading available');

  return {
    aqi: data.aqi,
    pm25: data.iaqi?.pm25?.v,
    pm10: data.iaqi?.pm10?.v,
    measuredAt: data.time?.iso ? new Date(data.time.iso) : null,
  };
}

function renderAirQuality(elements, state, nextRefreshAt) {
  const nextRefresh = nextRefreshAt ? formatTime(nextRefreshAt) : '--:--';

  if (state.status !== 'ready') {
    elements.value.textContent = '--';
    elements.value.dataset.tone = '';
    elements.level.textContent = t(`airQuality.${state.status === 'error' ? 'error' : 'loading'}`);
    elements.pollutants.textContent = '';
    elements.updated.textContent = t('airQuality.updated', { measuredAt: '--', nextRefresh });
    return;
  }

  const { aqi, pm25, pm10, measuredAt } = state.reading;
  const level = aqiLevel(aqi);
  const formatReading = (value) => (typeof value === 'number' ? Math.round(value) : '--');

  elements.value.textContent = Math.round(aqi);
  elements.value.dataset.tone = level.tone;
  elements.level.textContent = t(`airQuality.levels.${level.id}`);
  elements.pollutants.textContent = t('airQuality.pollutants', { pm25: formatReading(pm25), pm10: formatReading(pm10) });
  elements.updated.textContent = t('airQuality.updated', {
    measuredAt: measuredAt ? formatDateTime(measuredAt) : '--',
    nextRefresh,
  });
}
