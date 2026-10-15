/** Application-wide configuration. */

export const MACAU_CENTER = Object.freeze({ lat: 22.1987, lng: 113.5439 });
export const MAIN_MAP_ZOOM = 14;
export const DISTRICT_MAP_ZOOM = 12;

export const TILE_LAYER = Object.freeze({
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
});

/** Detection endpoint served by `backend/garbage_detection/server.py`. */
export const DETECTION_API_URL = 'http://localhost:8000/detect-garbage';

export const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

/** World Air Quality Index feed. WAQI tokens are client-side keys and are visible to every visitor. */
export const WAQI_FEED_URL = 'https://api.waqi.info/feed/macau/';
export const WAQI_TOKEN = '4785be414cf9e8c69bc5ff3a40ad470028c23eac';
export const AQI_REFRESH_INTERVAL_MS = 15 * 60 * 1000;
