import { MACAU_CENTER, MAIN_MAP_ZOOM } from './config.js';
import { createRecord } from './data/garbage-records.js';
import { initAirQuality } from './features/air-quality.js';
import { initCameraRecognition } from './features/camera-recognition.js';
import { initDisasterSimulation } from './features/disaster-simulation.js';
import { initDistrictMaps } from './features/district-maps.js';
import { GarbageMap } from './features/garbage-map.js';
import { initIntro, MODES } from './features/intro.js';
import { initMapControls } from './features/map-controls.js';
import { renderShelters } from './features/shelters.js';
import { initWeather } from './features/weather.js';
import { DEFAULT_LANGUAGE, getLanguage, setLanguage } from './i18n/index.js';

const garbageMap = new GarbageMap(document.getElementById('garbage-map'), { center: MACAU_CENTER, zoom: MAIN_MAP_ZOOM });

renderShelters(document.getElementById('shelter-list'));
initDisasterSimulation();
initMapControls(garbageMap);
initDistrictMaps(document.getElementById('district-maps'), { onSelect: (district) => garbageMap.flyTo(district) });
initCameraRecognition({
  // The browser camera has no GPS, so detections are pinned to the current map center.
  onDetections: (detections) => {
    const { lat, lng } = garbageMap.center;
    detections.forEach(({ type, count }) => garbageMap.add(createRecord({ type, count, lat, lng })));
  },
});

document.querySelectorAll('[data-language-toggle]').forEach((button) => {
  button.addEventListener('click', () => setLanguage(getLanguage() === 'zh' ? 'en' : 'zh'));
});
setLanguage(DEFAULT_LANGUAGE);

initWeather(MACAU_CENTER);
initAirQuality();
initIntro(openWorkspace);

function openWorkspace(mode) {
  const showRecognition = mode === MODES.RECOGNITION;
  document.getElementById('recognition').hidden = !showRecognition;
  document.getElementById('nav-recognition').hidden = !showRecognition;
  document.getElementById('workspace').classList.toggle('workspace--split', showRecognition);
}
