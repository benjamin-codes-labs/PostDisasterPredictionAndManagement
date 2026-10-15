export const randomBetween = (min, max) => min + Math.random() * (max - min);

export const randomInt = (min, max) => Math.floor(randomBetween(min, max + 1));

export const randomItem = (items) => items[Math.floor(Math.random() * items.length)];

/** Short unique-enough id; unlike `crypto.randomUUID` it also works outside secure contexts. */
export const createId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
