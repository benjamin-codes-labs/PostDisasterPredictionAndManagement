/** WMO weather interpretation codes (as returned by Open-Meteo) grouped into display conditions. */
const CONDITIONS = [
  { id: 'clear', icon: '☀️', codes: [0] },
  { id: 'mainlyClear', icon: '🌤️', codes: [1] },
  { id: 'partlyCloudy', icon: '⛅', codes: [2] },
  { id: 'overcast', icon: '☁️', codes: [3] },
  { id: 'fog', icon: '🌫️', codes: [45, 48] },
  { id: 'drizzle', icon: '🌦️', codes: [51, 53, 55, 56, 57] },
  { id: 'rain', icon: '🌧️', codes: [61, 63, 65, 66, 67] },
  { id: 'snow', icon: '🌨️', codes: [71, 73, 75, 77, 85, 86] },
  { id: 'showers', icon: '🌦️', codes: [80, 81, 82] },
  { id: 'thunderstorm', icon: '⛈️', codes: [95, 96, 99] },
];

const UNKNOWN_CONDITION = { id: 'unknown', icon: '❓' };

const CONDITIONS_BY_CODE = new Map(CONDITIONS.flatMap((condition) => condition.codes.map((code) => [code, condition])));

/** @returns {{ id: string, icon: string }} The condition id doubles as the i18n key under `weather.conditions.*`. */
export const weatherCondition = (code) => CONDITIONS_BY_CODE.get(code) ?? UNKNOWN_CONDITION;
