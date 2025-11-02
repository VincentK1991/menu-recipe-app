# Menu + Recipe ChatGPT App — FastMCP + React

This is an end-to-end prototype of a ChatGPT **App** powered by a Python **FastMCP server** with **React + Vite** UI widgets. It renders a clickable **dish gallery** and a **recipe card** using OpenAI Apps SDK components (served as MCP resources). Data is static for now.

## Architecture

- **Backend**: FastMCP (Python) - MCP server with tool definitions
- **Frontend**: React + Vite + TypeScript - UI widgets compiled to single HTML files
- **Integration**: OpenAI Apps SDK - `window.openai` bridge for tool calls and messaging

## Quick Start

### Option 1: One-Command Start (Recommended)

```bash
# Install dependencies first (one-time setup)
uv sync
cd server/ui-widget && npm install && cd ../..

# Start everything (builds widgets, starts server, opens ngrok tunnel)
./start.sh
```

The script will:
1. Build the React widgets
2. Start the MCP server on http://localhost:8080
3. Open an ngrok tunnel
4. Display the public URL at http://localhost:4040

Press `Ctrl+C` to stop all services.

### Option 2: Manual Setup

**1. Install Dependencies:**
```bash
# Python
uv sync

# Node.js
cd server/ui-widget && npm install && cd ../..
```

**2. Build UI Widgets:**
```bash
cd server/ui-widget
npm run build
cd ../..
```

**3. Run the MCP Server:**
```bash
source .venv/bin/activate
python -m server.main
```

**4. Expose via Tunnel (in another terminal):**
```bash
ngrok http 8080
# Or: cloudflared tunnel --url http://localhost:8080
```

Copy the public HTTPS URL from ngrok dashboard (http://localhost:4040).

## Connect from ChatGPT (Developer Mode)

1. ChatGPT → **Settings → Connectors → Developer Mode → Create**
2. Set **MCP Server URL** to your public tunnel URL
3. Save and start a new chat
4. Enable this connector in the chat

## Try It

Ask: *"Find quick pescatarian dinners under 600 kcal with lemon."*

You'll see the **gallery** (cards). Click **View recipe** to open the **recipe card**.

## Development Workflow

### Widget Development

```bash
cd server/ui-widget

# Start dev server with hot reload
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

The dev server runs on `http://localhost:5173` but won't have access to `window.openai` APIs. For full testing, build and run the MCP server.

### Python Development

```bash
# Format code
ruff format server/

# Lint
ruff check server/

# Type check
pyright server/
```

## Project Structure

```
menu-recipe-app/
├── server/
│   ├── main.py              # FastMCP server with tools and resources
│   ├── ui-widget/           # React + Vite widget source
│   │   ├── src/
│   │   │   ├── main.tsx     # Entry point
│   │   │   ├── App.tsx      # Gallery component
│   │   │   ├── types.ts     # TypeScript interfaces
│   │   │   ├── components/
│   │   │   │   ├── DishCard.tsx
│   │   │   │   └── ErrorBoundary.tsx
│   │   │   └── __tests__/   # Vitest tests
│   │   ├── dist/            # Built widgets (git-ignored)
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── tsconfig.json
│   └── __init__.py
├── pyproject.toml           # Python dependencies
├── README.md
└── uv.lock
```

## Key Features

### Debugging Hooks

The React widgets include comprehensive debugging features:

- **Error Boundary**: Catches and displays rendering errors with stack traces
- **Console Logging**: All prop reception and tool calls are logged to console
- **Fallback UI**: Graceful handling of missing or malformed data
- **TypeScript**: Full type safety for props and window.openai APIs

Open browser DevTools (F12) to see debug logs when the widget loads.

### Widget Props Contract

**Gallery Widget** (from `search_dishes` tool):
```typescript
interface GalleryProps {
  items: Dish[];
  content?: string;
}
```

**Recipe Card Widget** (from `get_recipe` tool):
```typescript
interface RecipeProps {
  id: string;
  title: string;
  imageUrl?: string;
  ingredients: Array<{ name: string; qty: string }>;
  steps: string[];
  nutrition?: { kcal: number; protein_g: number; carb_g: number; fat_g: number };
  benefits?: string[];
  tags?: string[];
}
```

### OpenAI Apps SDK Integration

The widgets use these `window.openai` APIs:

- `window.globalProps` - Primary way to receive props from MCP tools
- `window.openai.callTool(name, args)` - Call MCP tools from the widget
- `window.openai.postMessage(msg)` - Send messages back to chat
- `window.openai.setWidgetState(state)` - Persist state across renders (future)

## Testing

### Widget Tests

```bash
cd server/ui-widget
npm test
```

Tests cover:
- Component rendering with valid/invalid props
- Error boundary error catching
- Tool call triggers
- Empty states and fallbacks

### Manual Testing Checklist

1. ✅ Build widgets successfully (`npm run build`)
2. ✅ Start MCP server without errors
3. ✅ Connect from ChatGPT Developer Mode
4. ✅ Search for dishes - gallery renders
5. ✅ Click "View recipe" - recipe card opens
6. ✅ Check browser console - no errors, debug logs visible
7. ✅ Test with invalid queries - empty state shows

## Notes

- Responses include tool output that becomes `window.globalProps` in the widget
- Components are provided via MCP **resources** with MIME `text/html+skybridge`
- Replace the static `MENU` list later with real APIs (Spoonacular/Edamam/USDA) without changing the component contract
- The single-file build approach makes deployment simple - no separate static file server needed

## Troubleshooting

**Widget not loading:**
- Check that `server/ui-widget/dist/index.html` exists
- Rebuild widgets: `cd server/ui-widget && npm run build`

**No debug logs in console:**
- Open browser DevTools (F12) before the widget loads
- Check the Console tab

**Tool calls not working:**
- Verify `window.openai.callTool` is available in console
- Check that you're testing via ChatGPT, not the local dev server

**Type errors:**
- Run `npm run build` in `server/ui-widget/` to check TypeScript
- Fix any type errors before deploying
