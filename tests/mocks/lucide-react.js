// Mock for lucide-react icons
module.exports = new Proxy({}, {
  get: (target, prop) => {
    if (prop === '__esModule') {
      return true;
    }
    // Return a mock component for any icon
    return () => null;
  }
});