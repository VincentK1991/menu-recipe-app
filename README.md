# Menu + Recipe ChatGPT App — POC (Python MCP)

This is a minimal end‑to‑end prototype of a ChatGPT **App** powered by a Python **MCP server**. It renders a clickable **dish gallery** and a **recipe card** using Apps SDK components (served as MCP resources). Data is static for now.

## Run locally

```bash
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
python -m server.main  # starts on http://localhost:8080
```

Expose it so ChatGPT can reach it:

```bash
# pick one tunnel solution
ngrok http 8080
# or cloudflared tunnel --url http://localhost:8080
```

Copy the public HTTPS URL.

## Connect from ChatGPT (Developer Mode)
1. ChatGPT → **Settings → Connectors → Developer Mode → Create**.
2. Set **MCP Server URL** to your public tunnel URL.
3. Save. Start a new chat and enable this connector.

## Try it
Ask: *“Find quick pescatarian dinners under 600 kcal with lemon.”*
You’ll see the **gallery** (cards). Click **View recipe** to open the **recipe card**.

## Notes
- Responses include `structured_content` and `_meta.openai/outputTemplate` keys; components are provided via MCP **resources** with MIME `text/html+skybridge`.
- Replace the static `MENU` list later with real APIs (Spoonacular/Edamam/USDA) without changing the component contract.
"""
