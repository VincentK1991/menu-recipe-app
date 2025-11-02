# Pizzaz MCP server (Python)

This directory packages a Python implementation of the Pizzaz demo server using the `FastMCP` helper from the official Model Context Protocol SDK. It mirrors the Node example and exposes each pizza widget as both a resource and a tool.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Building Assets](#building-assets)
- [Running the Server](#running-the-server)
- [Deployment with ngrok](#deployment-with-ngrok)
- [Architecture & Flow](#architecture--flow)
- [Widget Hydration Mechanism](#widget-hydration-mechanism)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Python 3.10+
- Node.js 18+ (for building frontend assets)
- pnpm (for package management)
- A virtual environment (recommended)

## Installation

### 1. Install Python dependencies

```bash
cd pizzaz_server_python
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

> **Heads up:** There is a similarly named package named `modelcontextprotocol`
> on PyPI that is unrelated to the official MCP SDK. The requirements file
> installs the official `mcp` distribution with its FastAPI extra so that the
> `mcp.server.fastmcp` module is available. If you previously installed the
> other project, run `pip uninstall modelcontextprotocol` before reinstalling
> the requirements.

### 2. Install Node dependencies (from project root)

```bash
cd ..  # Back to project root
pnpm install
```

## Building Assets

Before running the server, you need to build the frontend React components into self-contained HTML files:

```bash
pnpm run build
```

This command does two things:
1. **Builds React components** using Vite with relative paths (`BASE_URL="."`)
2. **Inlines all assets** - embeds JavaScript and CSS directly into HTML files

The build process creates files in the `assets/` directory:
- `pizzaz-list-2d2b.html` - Self-contained HTML with inlined JS/CSS
- `pizzaz-carousel-2d2b.html` - Carousel widget
- `pizzaz-albums-2d2b.html` - Albums widget
- `pizzaz-2d2b.html` - Map widget
- And corresponding `.js` and `.css` files (for reference)

**Why inline assets?** ChatGPT renders widgets in a sandboxed iframe (`web-sandbox.oaiusercontent.com`). When HTML uses relative paths like `./script.js`, the browser tries to load them from ChatGPT's sandbox domain (not your server), resulting in 404 errors. Inlining ensures the HTML is completely self-contained.

## Running the Server

### Local Development

```bash
cd pizzaz_server_python
uvicorn main:app --port 8000 --reload
```

Or simply:

```bash
python main.py
```

This boots a FastAPI app on `http://127.0.0.1:8000` with the following endpoints:

- **`GET /mcp`** - SSE stream for MCP protocol
- **`POST /mcp/messages?sessionId=...`** - Follow-up messages for active sessions
- **`GET /{filename}`** - Static file serving for HTML/JS/CSS assets

### Static File Serving

The server includes a custom `StaticFilesMiddleware` that serves files from the `assets/` directory:

```python
class StaticFilesMiddleware(BaseHTTPMiddleware):
    """Middleware to serve static files from assets directory."""

    async def dispatch(self, request, call_next):
        path = request.url.path.lstrip('/')

        if STATIC_FILE_PATTERN.match(path):
            file_path = os.path.join(ASSETS_DIR, path)
            if os.path.isfile(file_path):
                return FileResponse(file_path)

        return await call_next(request)
```

This middleware:
- Intercepts requests for static files (`.js`, `.css`, `.html`, etc.)
- Serves them with correct MIME types
- Doesn't interfere with MCP protocol endpoints

## Deployment with ngrok

To test with ChatGPT, expose your local server through ngrok:

```bash
ngrok http 8000
```

Copy the ngrok URL (e.g., `https://abc123.ngrok-free.dev`) and configure it in your ChatGPT MCP settings.

## Architecture & Flow

### 1. ChatGPT Discovers Tools

When ChatGPT connects to your MCP server:

```
ChatGPT → GET /mcp (SSE stream) → Server responds with available tools
```

The server exposes tools via `list_tools()`:

```python
[
  {
    "name": "pizza-list",
    "title": "Show Pizza List",
    "description": "Show Pizza List",
    "inputSchema": { "pizzaTopping": "string" },
    "_meta": {
      "openai/outputTemplate": "ui://widget/pizza-list.html",
      "openai/widgetAccessible": True,
      "openai/resultCanProduceWidget": True
    }
  }
]
```

### 2. User Invokes a Tool

When the user triggers a tool (e.g., "Show me a pizza list"):

```
ChatGPT → POST /mcp/messages → call_tool_request(name="pizza-list", args={"pizzaTopping": "pepperoni"})
```

### 3. Server Returns Widget HTML

The server responds with:

```python
{
  "content": [{"type": "text", "text": "Rendered a pizza list!"}],
  "structuredContent": {"pizzaTopping": "pepperoni"},
  "_meta": {
    "openai.com/widget": {
      "type": "resource",
      "resource": {
        "uri": "ui://widget/pizza-list.html",
        "mimeType": "text/html+skybridge",
        "text": "<html>...</html>"  # Full HTML with inlined JS/CSS
      }
    }
  }
}
```

Key components:
- **`content`** - Human-readable confirmation text
- **`structuredContent`** - JSON data for the widget to consume
- **`_meta["openai.com/widget"]`** - Embedded HTML resource

### 4. ChatGPT Renders the Widget

ChatGPT receives the response and:

1. **Creates a sandboxed iframe** at `web-sandbox.oaiusercontent.com`
2. **Injects the HTML** from `_meta["openai.com/widget"].resource.text`
3. **Loads the widget** in the sandbox

### 5. Widget Initialization

The HTML contains a React application that:

1. **Mounts to the DOM**:
   ```html
   <div id="pizzaz-list-root"></div>
   <script type="module">
     // React app code
     ReactDOM.createRoot(document.getElementById('pizzaz-list-root')).render(<App />)
   </script>
   ```

2. **Receives data from parent window** via `postMessage`:
   ```javascript
   window.addEventListener('message', (event) => {
     if (event.data.type === 'structured-content') {
       // event.data.payload contains {"pizzaTopping": "pepperoni"}
       setData(event.data.payload);
     }
   });
   ```

## Widget Hydration Mechanism

### What is Hydration?

In this context, "hydration" refers to how the widget receives and displays dynamic data from the MCP server. It's a two-step process:

### Step 1: Initial HTML Delivery

The server sends a **static HTML shell** with embedded React code:

```python
html = _load_widget_html("pizzaz-list")  # Loads pizzaz-list-2d2b.html
return types.TextResourceContents(
    uri="ui://widget/pizza-list.html",
    mimeType="text/html+skybridge",
    text=html,  # Self-contained HTML with React app
)
```

### Step 2: Data Injection via `structuredContent`

The server also sends **structured data** separately:

```python
return types.CallToolResult(
    content=[...],
    structuredContent={"pizzaTopping": topping},  # Dynamic data
    _meta={...}
)
```

ChatGPT passes this `structuredContent` to the widget via `postMessage`:

```javascript
// Inside the widget's React code
useEffect(() => {
  const handleMessage = (event) => {
    if (event.data.type === 'structured-content') {
      const data = event.data.payload;  // {"pizzaTopping": "pepperoni"}
      // Update React state with the data
      setPizzaTopping(data.pizzaTopping);
    }
  };

  window.addEventListener('message', handleMessage);
  return () => window.removeEventListener('message', handleMessage);
}, []);
```

### Complete Flow Diagram

```
┌─────────────┐
│   ChatGPT   │
└──────┬──────┘
       │ 1. User: "Show pizza list with pepperoni"
       ▼
┌─────────────────────┐
│   MCP Protocol      │
│  POST /mcp/messages │
└──────┬──────────────┘
       │ 2. call_tool_request(name="pizza-list", args={pizzaTopping: "pepperoni"})
       ▼
┌─────────────────────┐
│   Python Server     │
│  _call_tool_request │
└──────┬──────────────┘
       │ 3. Load HTML from assets/pizzaz-list-2d2b.html
       │    (self-contained with inlined React app)
       │
       │ 4. Return CallToolResult with:
       │    - HTML resource (embedded widget)
       │    - structuredContent: {pizzaTopping: "pepperoni"}
       ▼
┌─────────────────────┐
│   ChatGPT           │
│  Widget Renderer    │
└──────┬──────────────┘
       │ 5. Create sandboxed iframe
       │ 6. Inject HTML into iframe
       │ 7. Send structuredContent via postMessage
       ▼
┌─────────────────────┐
│  Widget (iframe)    │
│  React App Running  │
└──────┬──────────────┘
       │ 8. Receive postMessage with data
       │ 9. Update React state
       │ 10. Render UI with "pepperoni"
       ▼
┌─────────────────────┐
│   User sees:        │
│   🍕 Pizza List     │
│   Topping:          │
│   Pepperoni         │
└─────────────────────┘
```

## Troubleshooting

### Issue: "text/html" MIME type error for JavaScript files

**Symptom:**
```
Failed to load module script: Expected a JavaScript-or-Wasm module script
but the server responded with a MIME type of "text/html"
```

**Cause:** The server wasn't configured to serve static files, so requests for `.js` files returned HTML error pages.

**Fix:** We added `StaticFilesMiddleware` to serve files from the `assets/` directory with correct MIME types.

### Issue: CSS/JS files return 404 in ChatGPT sandbox

**Symptom:**
```
GET https://connector_xxx.web-sandbox.oaiusercontent.com/pizzaz-list-2d2b.js 404 (Not Found)
```

**Cause:** ChatGPT renders widgets in a sandboxed iframe with a different domain. When HTML uses relative paths (`./script.js`), the browser tries to load them from the sandbox domain instead of your server.

**Fix:** We created `inline-assets.mts` to embed all JavaScript and CSS directly into the HTML files, making them completely self-contained.

### Issue: Widget not receiving data

**Symptom:** Widget loads but shows no data or default values.

**Cause:** The widget isn't listening for `postMessage` events, or the `structuredContent` format doesn't match what the widget expects.

**Fix:** Ensure your widget includes a `postMessage` listener and that the `structuredContent` keys match what the React app expects:

```javascript
window.addEventListener('message', (event) => {
  if (event.data.type === 'structured-content') {
    console.log('Received data:', event.data.payload);
    // Update state here
  }
});
```

## Next Steps

Use these handlers as a starting point when wiring in real data, authentication, or localization support. The structure demonstrates how to:

1. **Register reusable UI resources** that load static HTML bundles
2. **Associate tools with widgets** via `_meta.openai/outputTemplate`
3. **Ship structured JSON** alongside human-readable confirmation text
4. **Hydrate widgets dynamically** using `structuredContent` and `postMessage`
5. **Serve static assets** correctly with proper MIME types
6. **Create self-contained widgets** that work in sandboxed environments
