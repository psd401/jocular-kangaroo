// CJS mock for nanoid (ESM-only in v5+)
let counter = 0;
module.exports = {
  __esModule: true,
  nanoid: (size) => `mock-${++counter}`,
  customAlphabet: () => () => `mock-${++counter}`,
  urlAlphabet: 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict',
};
