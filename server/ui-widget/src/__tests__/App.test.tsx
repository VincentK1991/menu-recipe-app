import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';
import type { GalleryProps } from '../types';

describe('App', () => {
  it('renders empty state when no items provided', () => {
    const props: GalleryProps = { items: [] };
    render(<App initialProps={props} />);
    
    expect(screen.getByText('No dishes found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search criteria')).toBeInTheDocument();
  });

  it('renders title and content', () => {
    const props: GalleryProps = {
      items: [],
      content: 'Found 0 dishes.',
    };
    render(<App initialProps={props} />);
    
    expect(screen.getByText('My personal 123 Dishes')).toBeInTheDocument();
    expect(screen.getByText('Found 0 dishes.')).toBeInTheDocument();
  });

  it('renders dish cards when items provided', () => {
    const props: GalleryProps = {
      items: [
        {
          id: 'test-1',
          title: 'Test Dish 1',
          imageUrl: 'https://example.com/image1.jpg',
          quickFacts: { kcal: 500, protein_g: 30 },
        },
        {
          id: 'test-2',
          title: 'Test Dish 2',
          quickFacts: { kcal: 400, protein_g: 25 },
        },
      ],
      content: 'Found 2 dishes.',
    };
    render(<App initialProps={props} />);
    
    expect(screen.getByText('Test Dish 1')).toBeInTheDocument();
    expect(screen.getByText('Test Dish 2')).toBeInTheDocument();
    expect(screen.getByText('Found 2 dishes.')).toBeInTheDocument();
  });

  it('handles missing props gracefully', () => {
    const props: GalleryProps = {};
    render(<App initialProps={props} />);
    
    // Should render empty state
    expect(screen.getByText('No dishes found')).toBeInTheDocument();
  });
});

