const freeGlobal = require('lodash/_freeGlobal');

const globalThisFallback = (() => {
  if (typeof globalThis !== 'undefined') return globalThis;
  if (typeof self !== 'undefined') return self;
  if (typeof window !== 'undefined') return window;
  if (typeof global !== 'undefined') return global;
  return {};
})();

const root = freeGlobal || globalThisFallback;

module.exports = root;
