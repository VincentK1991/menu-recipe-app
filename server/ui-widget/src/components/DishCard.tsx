import React, { useState } from 'react';
import type { Dish } from '../types';

interface DishCardProps {
  item: Dish;
}

/**
 * DishCard component displays a single dish with image, title, quick facts,
 * and action buttons that interact with the OpenAI Apps SDK.
 */
function DishCard({ item }: DishCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleViewRecipe = () => {
    console.log('DishCard: Calling get_recipe tool for', item.id);
    
    if (!window.openai?.callTool) {
      console.error('window.openai.callTool is not available');
      return;
    }
    
    window.openai.callTool('get_recipe', { recipe_id: item.id });
  };

  const handleAdd = () => {
    console.log('DishCard: Posting message to add dish', item.id);
    
    if (!window.openai?.postMessage) {
      console.warn('window.openai.postMessage is not available');
      return;
    }
    
    window.openai.postMessage({ 
      type: 'select', 
      id: item.id,
      title: item.title,
    });
  };

  const cardStyle: React.CSSProperties = {
    border: '1px solid var(--card-border)',
    borderRadius: '12px',
    padding: '10px',
    background: 'var(--bg, #fff)',
    boxShadow: isHovered 
      ? '0 6px 18px var(--hover-shadow)' 
      : '0 1px 2px rgba(0, 0, 0, 0.04)',
    transform: isHovered ? 'translateY(-2px)' : 'none',
    transition: 'transform 120ms ease, box-shadow 120ms ease',
    cursor: 'default',
  };

  const imageStyle: React.CSSProperties = {
    width: '100%',
    height: '130px',
    objectFit: 'cover',
    borderRadius: '8px',
    backgroundColor: '#f3f4f6',
  };

  const titleStyle: React.CSSProperties = {
    fontWeight: 600,
    lineHeight: 1.2,
    marginTop: '8px',
    fontSize: '14px',
  };

  const mutedStyle: React.CSSProperties = {
    fontSize: '12px',
    color: 'var(--muted)',
    marginTop: '2px',
  };

  const buttonContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '6px',
    marginTop: '8px',
  };

  const buttonBaseStyle: React.CSSProperties = {
    padding: '6px 10px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'background 120ms ease',
  };

  const outlineButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    border: '1px solid #d1d5db',
    background: '#f8fafc',
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    border: '1px solid #0ea5e9',
    background: '#e0f2fe',
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {item.imageUrl ? (
        <img 
          src={item.imageUrl} 
          alt={item.title} 
          style={imageStyle}
          onError={(e) => {
            console.warn('Failed to load image for', item.id);
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div style={imageStyle} />
      )}
      
      <div style={titleStyle}>{item.title}</div>
      
      <div style={mutedStyle}>
        {item.quickFacts?.kcal ?? '—'} kcal • {item.quickFacts?.protein_g ?? '—'}g protein
      </div>
      
      <div style={buttonContainerStyle}>
        <button
          onClick={handleViewRecipe}
          style={outlineButtonStyle}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.background = '#eef2f7';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.background = '#f8fafc';
          }}
        >
          View recipe
        </button>
        
        <button
          onClick={handleAdd}
          style={primaryButtonStyle}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.background = '#bae6fd';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.background = '#e0f2fe';
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

export default DishCard;

