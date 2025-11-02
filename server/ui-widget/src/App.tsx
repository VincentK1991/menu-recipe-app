import React from 'react';
import DishCard from './components/DishCard';
import type { GalleryProps } from './types';

interface AppProps {
  initialProps: GalleryProps;
}

/**
 * Main App component for the dish gallery widget.
 * Reads props from window.globalProps and renders a grid of DishCard components.
 */
function App({ initialProps }: AppProps) {
  const items = initialProps.items ?? [];
  const content = initialProps.content ?? '';

  // Log props for debugging
  React.useEffect(() => {
    console.log('App mounted with props:', initialProps);
    console.log('Items count:', items.length);
    console.log('window.openai available:', !!window.openai);
    console.log('window.openai.callTool available:', !!window.openai?.callTool);
  }, [initialProps, items.length]);

  const toolbarStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    flexWrap: 'wrap',
    gap: '8px',
  };

  const titleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600,
  };

  const contentStyle: React.CSSProperties = {
    color: 'var(--muted)',
    fontSize: '14px',
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
    gap: '12px',
  };

  const emptyStateStyle: React.CSSProperties = {
    padding: '40px 20px',
    textAlign: 'center',
    color: 'var(--muted)',
  };

  // Empty state
  if (items.length === 0) {
    return (
      <div>
        <div style={toolbarStyle}>
          <h2 style={titleStyle}>My personal 123 Dishes</h2>
          {content && <span style={contentStyle}>{content}</span>}
        </div>
        <div style={emptyStateStyle}>
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>
            No dishes found
          </p>
          <p style={{ fontSize: '14px', opacity: 0.7 }}>
            Try adjusting your search criteria
          </p>
        </div>
      </div>
    );
  }

  // Normal state with dishes
  return (
    <div>
      <div style={toolbarStyle}>
        <h2 style={titleStyle}>My personal 123 Dishes</h2>
        {content && <span style={contentStyle}>{content}</span>}
      </div>
      <div style={gridStyle}>
        {items.map((item) => (
          <DishCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

export default App;

