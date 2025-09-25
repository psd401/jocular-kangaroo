// Mock for nanoid to avoid ES module issues in Jest
export const nanoid = jest.fn(() => 'mock-id-1234567890');
export default { nanoid };