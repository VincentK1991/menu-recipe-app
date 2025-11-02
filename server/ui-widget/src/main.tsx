import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import type { GalleryProps } from './types';

// Log environment for debugging
console.log('Widget initializing...');
console.log('window.globalProps:', window.globalProps);
console.log('window.openai:', window.openai);

// Read props provided by ChatGPT Apps SDK
// Priority: window.globalProps > window.openai.structuredContent > empty object
const props: GalleryProps =
  window.globalProps ??
  (window.openai?.structuredContent as GalleryProps | undefined) ??
  {};

console.log('Resolved props:', props);

// Mount the React app
const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('Root element not found!');
  throw new Error('Root element #root not found in the DOM');
}

const root = createRoot(rootElement);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App initialProps={props} />
    </ErrorBoundary>
  </React.StrictMode>
);

console.log('Widget mounted successfully');

