/** Captures a camera frame and sends it to the detection API. */
import { DETECTION_API_URL } from '../config.js';
import { typeLabel } from '../data/garbage-types.js';
import { onLanguageChange, t } from '../i18n/index.js';

const JPEG_QUALITY = 0.9;

/**
 * @typedef {{ type: string, count: number }} Detection
 * @param {{ onDetections: (detections: Detection[]) => void }} options
 */
export function initCameraRecognition({ onDetections }) {
  const preview = document.getElementById('camera-preview');
  const startButton = document.getElementById('camera-start');
  const captureButton = document.getElementById('camera-capture');
  const resetButton = document.getElementById('camera-reset');
  const resultElement = document.getElementById('camera-result');

  let stream = null;
  /** @type {{ status: 'idle' | 'recognizing' | 'found' | 'empty' | 'error', key?: string, message?: string, detections?: Detection[] }} */
  let state = { status: 'idle' };

  const render = () => {
    resultElement.dataset.status = state.status;
    resultElement.textContent = describeState(state);
  };
  const setState = (nextState) => {
    state = nextState;
    render();
  };
  const setCameraActive = (active) => {
    startButton.disabled = active;
    captureButton.disabled = !active;
    resetButton.disabled = !active;
  };

  startButton.addEventListener('click', async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      preview.srcObject = stream;
      setCameraActive(true);
      setState({ status: 'idle' });
    } catch (error) {
      setState({ status: 'error', key: 'camera.startFailed', message: error.message });
    }
  });

  captureButton.addEventListener('click', async () => {
    setState({ status: 'recognizing' });
    try {
      const detections = await detectGarbage(await captureFrame(preview));
      if (detections.length === 0) {
        setState({ status: 'empty' });
        return;
      }
      onDetections(detections);
      setState({ status: 'found', detections });
    } catch (error) {
      setState({ status: 'error', key: 'camera.failed', message: error.message });
    }
  });

  resetButton.addEventListener('click', () => {
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    preview.srcObject = null;
    setCameraActive(false);
    setState({ status: 'idle' });
  });

  onLanguageChange(render);
}

function describeState(state) {
  switch (state.status) {
    case 'recognizing':
      return t('camera.recognizing');
    case 'found':
      return t('camera.found', {
        summary: state.detections.map(({ type, count }) => `${typeLabel(type)} × ${count}`).join(', '),
      });
    case 'empty':
      return t('camera.nothingFound');
    case 'error':
      return t(state.key, { message: state.message });
    default:
      return '';
  }
}

function captureFrame(video) {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not capture a frame'))), 'image/jpeg', JPEG_QUALITY);
  });
}

/** @returns {Promise<Detection[]>} */
async function detectGarbage(image) {
  const body = new FormData();
  body.append('file', image, 'capture.jpg');

  const response = await fetch(DETECTION_API_URL, { method: 'POST', body });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const { detections } = await response.json();
  return detections;
}
