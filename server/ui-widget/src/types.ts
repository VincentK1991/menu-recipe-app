// TypeScript interfaces matching the MCP tool output shapes

export interface QuickFacts {
  kcal?: number;
  protein_g?: number;
  tags?: string[];
}

export interface Dish {
  id: string;
  title: string;
  imageUrl?: string;
  quickFacts?: QuickFacts;
}

export interface GalleryProps {
  // This mirrors the Python search_dishes tool return shape
  items?: Dish[];
  content?: string; // Optional transcript text
}

export interface Ingredient {
  name: string;
  qty: string;
}

export interface Nutrition {
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
}

export interface RecipeProps {
  // This mirrors the Python get_recipe tool return shape
  id: string;
  title: string;
  imageUrl?: string;
  ingredients: Ingredient[];
  steps: string[];
  nutrition?: Nutrition;
  benefits?: string[];
  tags?: string[];
}

// Global window APIs provided by the OpenAI Apps SDK
declare global {
  interface Window {
    // Primary way Apps SDK passes props to the widget
    globalProps?: GalleryProps | RecipeProps;
    
    // OpenAI Apps SDK bridge APIs
    openai?: {
      // Call MCP tools from the widget
      callTool?: (name: string, args?: unknown) => void;
      
      // Send messages back to the chat
      postMessage?: (msg: unknown) => void;
      
      // Persist widget state across renders
      setWidgetState?: (state: unknown) => void;
      
      // Legacy/alternative prop source
      structuredContent?: unknown;
    };
  }
}

export {};

