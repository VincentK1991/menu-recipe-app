# Quick Start Guide - Pizzaz MCP Server

This guide will get you up and running with the Pizzaz MCP server and explain the complete flow from ChatGPT to widget rendering.

## 🚀 Quick Setup (5 minutes)

### 1. Install Dependencies

```bash
# Install Node.js dependencies
pnpm install

# Install Python dependencies
cd pizzaz_server_python
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### 2. Build Frontend Assets

```bash
pnpm run build
```

This creates self-contained HTML files with inlined JavaScript and CSS in the `assets/` directory.

### 3. Start the Server

```bash
cd pizzaz_server_python
uvicorn main:app --port 8000
```

Or simply:
```bash
python main.py
```

### 4. Expose via ngrok (for ChatGPT testing)

```bash
ngrok http 8000
```

Copy the ngrok URL and add it to your ChatGPT MCP settings.

---

## 🔍 Understanding the Complete Flow

### Architecture Overview

```
┌──────────┐     MCP Protocol    ┌──────────────┐     Static Files    ┌──────────┐
│ ChatGPT  │ ←─────────────────→ │ FastAPI      │ ←─────────────────→ │ assets/  │
│          │   (SSE/HTTP)         │ Server       │   (Middleware)      │ HTML/JS  │
└──────────┘                      └──────────────┘                      └──────────┘
     ↓                                   ↓
     │                                   │
     ↓                                   ↓
┌──────────────────────────────────────────────────────────────────────────┐
│ Widget Rendering Flow                                                     │
│                                                                           │
│ 1. Tool Discovery    → ChatGPT asks: "What tools do you have?"          │
│ 2. Tool Invocation   → User: "Show me a pizza list"                     │
│ 3. HTML Delivery     → Server sends self-contained HTML + data          │
│ 4. Sandbox Creation  → ChatGPT creates iframe at web-sandbox domain     │
│ 5. HTML Injection    → Injects HTML into iframe                         │
│ 6. Data Hydration    → Sends structuredContent via postMessage          │
│ 7. Widget Renders    → React app receives data and displays UI          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 📡 Detailed Flow Explanation

### Step 1: Tool Discovery

When ChatGPT connects to your server, it discovers available tools:

**Request:**
```http
GET /mcp HTTP/1.1
Accept: text/event-stream
```

**Server Response:**
```python
# In main.py: _list_tools()
[
  Tool(
    name="pizza-list",
    title="Show Pizza List",
    inputSchema={"pizzaTopping": {"type": "string"}},
    _meta={
      "openai/outputTemplate": "ui://widget/pizza-list.html",
      "openai/widgetAccessible": True,
      "openai/resultCanProduceWidget": True
    }
  )
]
```

The `_meta` field tells ChatGPT:
- This tool produces a widget
- The widget template URI is `ui://widget/pizza-list.html`
- The tool is accessible and can render widgets

---

### Step 2: Tool Invocation

User says: **"Show me a pizza list with pepperoni"**

ChatGPT interprets this and calls the tool:

**Request:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "pizza-list",
    "arguments": {
      "pizzaTopping": "pepperoni"
    }
  }
}
```

---

### Step 3: Server Processes Request

The server's `_call_tool_request()` function:

```python
# 1. Load the pre-built HTML file
html = _load_widget_html("pizzaz-list")  # → pizzaz-list-2d2b.html

# 2. Create embedded resource
widget_resource = types.EmbeddedResource(
    type="resource",
    resource=types.TextResourceContents(
        uri="ui://widget/pizza-list.html",
        mimeType="text/html+skybridge",
        text=html  # ← FULL HTML with inlined React app
    )
)

# 3. Return response with widget + data
return types.CallToolResult(
    content=[
        types.TextContent(text="Rendered a pizza list!")
    ],
    structuredContent={"pizzaTopping": "pepperoni"},  # ← Data for widget
    _meta={
        "openai.com/widget": widget_resource.model_dump(mode="json")
    }
)
```

---

### Step 4: ChatGPT Renders Widget

ChatGPT receives the response and:

1. **Extracts the HTML** from `_meta["openai.com/widget"].resource.text`
2. **Creates a sandboxed iframe** at `https://connector_xxx.web-sandbox.oaiusercontent.com`
3. **Injects the HTML** into the iframe
4. **Sends `structuredContent`** to the iframe via `postMessage`

---

### Step 5: Widget Hydration

The HTML contains a React application that listens for data:

```javascript
// Inside assets/pizzaz-list-2d2b.html (inlined)
useEffect(() => {
  const handleMessage = (event) => {
    // Listen for data from ChatGPT
    if (event.data.type === 'structured-content') {
      const data = event.data.payload;
      console.log('Received:', data);  // {"pizzaTopping": "pepperoni"}

      // Update React state
      setPizzaTopping(data.pizzaTopping);
    }
  };

  window.addEventListener('message', handleMessage);
  return () => window.removeEventListener('message', handleMessage);
}, []);
```

**Result:** The widget displays "🍕 Pepperoni" pizza list!

---

## 🔧 The Fixes We Made

### Problem 1: MIME Type Errors

**Error:**
```
Failed to load module script: Expected a JavaScript-or-Wasm module script
but the server responded with a MIME type of "text/html"
```

**Root Cause:** FastAPI wasn't configured to serve static files. When browsers requested `.js` files, they got HTML error pages instead.

**Solution:** Added `StaticFilesMiddleware` to `main.py`:

```python
class StaticFilesMiddleware(BaseHTTPMiddleware):
    STATIC_FILE_PATTERN = re.compile(
        r'.*\.(js|css|html|map|png|jpg|jpeg|gif|svg|ico)$'
    )

    async def dispatch(self, request, call_next):
        path = request.url.path.lstrip('/')

        if self.STATIC_FILE_PATTERN.match(path):
            file_path = os.path.join(ASSETS_DIR, path)
            if os.path.isfile(file_path):
                return FileResponse(file_path)  # ← Correct MIME types!

        return await call_next(request)
```

---

### Problem 2: 404 Errors in ChatGPT Sandbox

**Error:**
```
GET https://connector_xxx.web-sandbox.oaiusercontent.com/pizzaz-list-2d2b.js 404
```

**Root Cause:** ChatGPT renders widgets in a sandboxed iframe with a different domain. When HTML uses relative paths like `./script.js`, the browser tries to load them from the **sandbox domain** instead of your server.

**Solution:** Created `inline-assets.mts` to embed all JS and CSS directly into HTML:

```typescript
// Before (in HTML):
<script type="module" src="./pizzaz-list-2d2b.js"></script>
<link rel="stylesheet" href="./pizzaz-list-2d2b.css">

// After (inlined):
<style>
  /* All CSS here */
</style>
<script type="module">
  // All JavaScript here
</script>
```

Now the HTML is **completely self-contained** and works in any sandbox!

---

### Problem 3: Build Process Improvements

**Changes Made:**

1. **Modified `build-all.mts`** to support relative paths:
   ```typescript
   const useRelativePaths = baseUrlRaw === "." || baseUrlRaw === "./";
   const jsUrl = normalizedBaseUrl ? `${normalizedBaseUrl}/${name}-${h}.js` : `./${name}-${h}.js`;
   ```

2. **Created `inline-assets.mts`** to automatically inline assets after build

3. **Updated `package.json`** build script:
   ```json
   "build": "BASE_URL=\".\" tsx ./build-all.mts && tsx ./inline-assets.mts"
   ```

---

## 📊 File Size Considerations

After inlining, HTML files are larger but fully self-contained:

```bash
$ ls -lh assets/
-rw-r--r-- 1 user user 225K pizzaz-list-2d2b.html     # ← Self-contained
-rw-r--r-- 1 user user 190K pizzaz-list-2d2b.js       # ← Reference only
-rw-r--r-- 1 user user  34K pizzaz-list-2d2b.css      # ← Reference only
```

The `.js` and `.css` files are kept for reference but not used at runtime.

---

## 🎯 Key Takeaways

1. **MCP Protocol** - Standardized way for ChatGPT to discover and call tools
2. **Widget Metadata** - Tools declare they produce widgets via `_meta` fields
3. **Embedded Resources** - HTML is sent inline in the tool response
4. **Sandboxed Execution** - ChatGPT renders widgets in isolated iframes
5. **Data Hydration** - `structuredContent` is passed via `postMessage`
6. **Self-Contained HTML** - Inlining assets ensures widgets work in any sandbox

---

## 🐛 Common Issues & Solutions

### Widget shows blank screen

**Check:**
1. Browser console for JavaScript errors
2. React app mounts to correct DOM element (`#pizzaz-list-root`)
3. `postMessage` listener is properly set up

### Widget doesn't receive data

**Check:**
1. `structuredContent` keys match what widget expects
2. `postMessage` event type is `'structured-content'`
3. Data format matches widget's expected schema

### Build fails

**Check:**
1. Node.js version (requires 18+)
2. All dependencies installed: `pnpm install`
3. TypeScript types resolved correctly

---

## 📚 Further Reading

- **Full README:** See `pizzaz_server_python/README.md` for detailed documentation
- **MCP Specification:** https://spec.modelcontextprotocol.io/
- **Apps SDK Docs:** Check OpenAI's official Apps SDK documentation
- **FastMCP Library:** https://github.com/jlowin/fastmcp

---

## 🎉 You're Ready!

You now have a working MCP server that:
- ✅ Exposes tools to ChatGPT
- ✅ Serves self-contained widget HTML
- ✅ Handles data hydration correctly
- ✅ Works in sandboxed environments

Build amazing things! 🚀

