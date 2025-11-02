import '@testing-library/jest-dom';

// Mock window.openai for tests
global.window.openai = {
  callTool: vi.fn(),
  postMessage: vi.fn(),
  setWidgetState: vi.fn(),
  structuredContent: undefined,
};

