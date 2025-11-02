import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DishCard from '../components/DishCard';
import type { Dish } from '../types';

describe('DishCard', () => {
  const mockDish: Dish = {
    id: 'test-dish',
    title: 'Test Dish',
    imageUrl: 'https://example.com/test.jpg',
    quickFacts: {
      kcal: 500,
      protein_g: 30,
    },
  };

  beforeEach(() => {
    // Clear mocks before each test
    vi.clearAllMocks();
  });

  it('renders dish information correctly', () => {
    render(<DishCard item={mockDish} />);
    
    expect(screen.getByText('Test Dish')).toBeInTheDocument();
    expect(screen.getByText(/500 kcal/)).toBeInTheDocument();
    expect(screen.getByText(/30g protein/)).toBeInTheDocument();
  });

  it('renders with missing image', () => {
    const dishNoImage: Dish = {
      id: 'test-dish-no-image',
      title: 'Dish Without Image',
      quickFacts: { kcal: 400, protein_g: 20 },
    };
    render(<DishCard item={dishNoImage} />);
    
    expect(screen.getByText('Dish Without Image')).toBeInTheDocument();
  });

  it('renders with missing quick facts', () => {
    const dishNoFacts: Dish = {
      id: 'test-dish-no-facts',
      title: 'Dish Without Facts',
    };
    render(<DishCard item={dishNoFacts} />);
    
    expect(screen.getByText('Dish Without Facts')).toBeInTheDocument();
    expect(screen.getByText(/— kcal/)).toBeInTheDocument();
    expect(screen.getByText(/—g protein/)).toBeInTheDocument();
  });

  it('calls window.openai.callTool when View recipe button clicked', () => {
    render(<DishCard item={mockDish} />);
    
    const viewButton = screen.getByText('View recipe');
    fireEvent.click(viewButton);
    
    expect(window.openai?.callTool).toHaveBeenCalledWith('get_recipe', {
      recipe_id: 'test-dish',
    });
  });

  it('calls window.openai.postMessage when Add button clicked', () => {
    render(<DishCard item={mockDish} />);
    
    const addButton = screen.getByText('Add');
    fireEvent.click(addButton);
    
    expect(window.openai?.postMessage).toHaveBeenCalledWith({
      type: 'select',
      id: 'test-dish',
      title: 'Test Dish',
    });
  });

  it('handles missing window.openai gracefully', () => {
    // Temporarily remove window.openai
    const originalOpenai = window.openai;
    window.openai = undefined;
    
    render(<DishCard item={mockDish} />);
    
    const viewButton = screen.getByText('View recipe');
    
    // Should not throw error
    expect(() => fireEvent.click(viewButton)).not.toThrow();
    
    // Restore window.openai
    window.openai = originalOpenai;
  });
});

