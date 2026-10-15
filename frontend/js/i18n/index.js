/**
 * Minimal i18n: dictionary lookup, `{placeholder}` interpolation and
 * declarative translation of the DOM.
 *
 * Elements opt in with attributes that are re-applied on every language change:
 *   data-i18n="key"             -> textContent
 *   data-i18n-params='{"n":1}'  -> interpolation values for data-i18n
 *   data-i18n-list="key"        -> one <li> per entry of an array value
 *   data-i18n-aria-label="key"  -> aria-label attribute
 */
import en from './en.js';
import zh from './zh.js';

const LANGUAGES = {
  zh: { dictionary: zh, htmlLang: 'zh-Hant', locale: 'zh-MO' },
  en: { dictionary: en, htmlLang: 'en', locale: 'en-GB' },
};

export const DEFAULT_LANGUAGE = 'en';

let currentLanguage = DEFAULT_LANGUAGE;
const listeners = new Set();

export const getLanguage = () => currentLanguage;
export const getLocale = () => LANGUAGES[currentLanguage].locale;

const lookup = (dictionary, key) => key.split('.').reduce((node, part) => node?.[part], dictionary);

/** Translate `key`, filling `{name}` placeholders from `params`. Non-string values are returned as is. */
export function t(key, params = {}) {
  const value =
    lookup(LANGUAGES[currentLanguage].dictionary, key) ?? lookup(LANGUAGES[DEFAULT_LANGUAGE].dictionary, key);

  if (value === undefined) {
    console.warn(`Missing translation: ${key}`);
    return key;
  }
  if (typeof value !== 'string') return value;
  return value.replace(/\{(\w+)\}/g, (placeholder, name) => (name in params ? params[name] : placeholder));
}

/** Bind `element` to a translation key so it stays translated across language changes. */
export function setTranslatedText(element, key, params) {
  element.dataset.i18n = key;
  if (params) element.dataset.i18nParams = JSON.stringify(params);
  else delete element.dataset.i18nParams;
  element.textContent = t(key, params);
}

export function applyTranslations(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((element) => {
    const params = element.dataset.i18nParams ? JSON.parse(element.dataset.i18nParams) : undefined;
    element.textContent = t(element.dataset.i18n, params);
  });

  root.querySelectorAll('[data-i18n-list]').forEach((element) => {
    const items = t(element.dataset.i18nList);
    element.replaceChildren(
      ...(Array.isArray(items) ? items : []).map((item) => Object.assign(document.createElement('li'), { textContent: item })),
    );
  });

  root.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
    element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel));
  });
}

export function setLanguage(language) {
  if (!(language in LANGUAGES)) throw new Error(`Unsupported language: ${language}`);

  currentLanguage = language;
  document.documentElement.lang = LANGUAGES[language].htmlLang;
  document.title = t('app.title');
  applyTranslations();
  listeners.forEach((listener) => listener(language));
}

/** Register a callback for content that cannot be expressed with data-i18n attributes. */
export function onLanguageChange(listener) {
  listeners.add(listener);
}

export function formatDateTime(value, options = { dateStyle: 'medium', timeStyle: 'short' }) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value ?? '') : date.toLocaleString(getLocale(), options);
}

export const formatTime = (date) => formatDateTime(date, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
