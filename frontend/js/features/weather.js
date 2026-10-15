/** Current conditions, 7-day forecast and today's hourly breakdown from Open-Meteo. */
import { OPEN_METEO_URL } from '../config.js';
import { weatherCondition } from '../data/weather-codes.js';
import { formatTime, getLocale, onLanguageChange, t } from '../i18n/index.js';
import { createElement } from '../utils/dom.js';

const FORECAST_PARAMS = Object.freeze({
  current: 'temperature_2m,weather_code',
  hourly: 'temperature_2m,weather_code,precipitation',
  daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum',
  timezone: 'auto',
  forecast_days: '7',
});

const roundTo1 = (value) => Math.round(value * 10) / 10;

/** Open-Meteo returns local dates without an offset; parse them as local time. */
const parseLocalDate = (isoDate) => new Date(`${isoDate}T00:00`);

export async function initWeather({ lat, lng }) {
  const elements = {
    nowIcon: document.getElementById('weather-now-icon'),
    nowText: document.getElementById('weather-now-text'),
    days: document.getElementById('forecast-days'),
    today: document.getElementById('forecast-today'),
    hourly: document.getElementById('forecast-hourly'),
  };

  let state = { status: 'loading' };
  const render = () => renderWeather(elements, state);
  onLanguageChange(render);
  render();

  try {
    state = { status: 'ready', forecast: await fetchForecast(lat, lng) };
  } catch (error) {
    console.error('Failed to load weather forecast', error);
    state = { status: 'error' };
  }
  render();
}

async function fetchForecast(lat, lng) {
  const url = new URL(OPEN_METEO_URL);
  url.search = new URLSearchParams({ latitude: lat, longitude: lng, ...FORECAST_PARAMS });

  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function renderWeather(elements, state) {
  if (state.status !== 'ready') {
    const key = state.status === 'error' ? 'error' : 'loading';
    elements.nowIcon.textContent = '';
    elements.nowText.textContent = t(`weather.${key}`);
    elements.days.textContent = t(`forecast.${key}`);
    elements.today.textContent = '';
    elements.hourly.replaceChildren();
    return;
  }

  const { current, daily, hourly } = state.forecast;
  const condition = weatherCondition(current.weather_code);
  elements.nowIcon.textContent = condition.icon;
  elements.nowText.textContent = t('weather.current', {
    temperature: Math.round(current.temperature_2m),
    condition: t(`weather.conditions.${condition.id}`),
  });

  elements.days.replaceChildren(...daily.time.map((date, i) => renderDayCard(date, daily, i)));

  elements.today.textContent = t('forecast.todaySummary', {
    min: Math.round(daily.temperature_2m_min[0]),
    max: Math.round(daily.temperature_2m_max[0]),
    precipitation: roundTo1(daily.precipitation_sum[0]),
  });

  const today = daily.time[0];
  elements.hourly.replaceChildren(
    ...hourly.time.flatMap((time, i) => (time.startsWith(today) ? [renderHourCard(time, hourly, i)] : [])),
  );
}

function renderDayCard(date, daily, index) {
  const condition = weatherCondition(daily.weather_code[index]);
  return createElement('div', { className: 'forecast-card' }, [
    createElement('div', { className: 'forecast-card__label', text: parseLocalDate(date).toLocaleDateString(getLocale(), { weekday: 'short' }) }),
    createElement('div', { className: 'forecast-card__icon', text: condition.icon, attributes: { title: t(`weather.conditions.${condition.id}`) } }),
    createElement('div', {
      className: 'forecast-card__value',
      text: `${Math.round(daily.temperature_2m_max[index])}° / ${Math.round(daily.temperature_2m_min[index])}°`,
    }),
  ]);
}

function renderHourCard(time, hourly, index) {
  const condition = weatherCondition(hourly.weather_code[index]);
  return createElement('div', { className: 'forecast-card forecast-card--compact' }, [
    createElement('div', { className: 'forecast-card__label', text: formatTime(time) }),
    createElement('div', { className: 'forecast-card__icon', text: condition.icon, attributes: { title: t(`weather.conditions.${condition.id}`) } }),
    createElement('div', { className: 'forecast-card__value', text: `${Math.round(hourly.temperature_2m[index])}°` }),
    createElement('div', { className: 'forecast-card__detail', text: `${roundTo1(hourly.precipitation[index])} mm` }),
  ]);
}
