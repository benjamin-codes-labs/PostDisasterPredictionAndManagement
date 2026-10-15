/**
 * Create an element in one expression.
 *
 * @param {string} tag
 * @param {{ className?: string, text?: string, attributes?: Record<string, string>, dataset?: Record<string, string> }} [options]
 * @param {(Node | string)[]} [children]
 */
export function createElement(tag, { className, text, attributes = {}, dataset = {} } = {}, children = []) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
  Object.assign(element.dataset, dataset);
  element.append(...children);
  return element;
}

/** Trigger a browser download of `content` as a file. */
export function downloadFile(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = createElement('a', { attributes: { href: url, download: filename } });
  link.click();
  URL.revokeObjectURL(url);
}
