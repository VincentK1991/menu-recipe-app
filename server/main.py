import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI

# MCP (Model Context Protocol) SDK — FastMCP + HTTP transport
from mcp.server.fastmcp import FastMCP
from mcp.server.transport.http import create_http_app

# ---- App + static demo data -------------------------------------------------

mcp = FastMCP("menu-recipe-app")

# Static demo menu items (POC)
MENU: List[Dict[str, Any]] = [
    {
        "id": "r1",
        "title": "Garlic Lemon Salmon",
        "imageUrl": "https://picsum.photos/seed/salmon/512/384",
        "quickFacts": {"kcal": 420, "protein_g": 35, "tags": ["pescatarian", "quick"]},
        "details": {
            "ingredients": [
                {"name": "Salmon fillet", "qty": "200 g"},
                {"name": "Garlic", "qty": "2 cloves"},
                {"name": "Lemon", "qty": "1/2"},
                {"name": "Olive oil", "qty": "1 tbsp"},
                {"name": "Salt", "qty": "to taste"},
            ],
            "steps": [
                "Pat salmon dry; season with salt.",
                "Pan-sear 3–4 min/side; add garlic + lemon to finish.",
            ],
            "nutrition": {"kcal": 420, "protein_g": 35, "carb_g": 2, "fat_g": 28},
            "benefits": ["High in omega-3", "Good protein-to-calorie ratio"],
            "tags": ["pescatarian", "quick", "gluten-free"],
            "imageUrl": "https://picsum.photos/seed/salmon/1024/768",
        },
    },
    {
        "id": "r2",
        "title": "Spicy Chickpea Bowl",
        "imageUrl": "https://picsum.photos/seed/chickpea/512/384",
        "quickFacts": {"kcal": 540, "protein_g": 22, "tags": ["vegan", "high-fiber"]},
        "details": {
            "ingredients": [
                {"name": "Chickpeas (cooked)", "qty": "1 cup"},
                {"name": "Paprika", "qty": "1 tsp"},
                {"name": "Cumin", "qty": "1/2 tsp"},
                {"name": "Olive oil", "qty": "1 tbsp"},
                {"name": "Lemon", "qty": "1/2"},
            ],
            "steps": [
                "Toast spices in oil.",
                "Toss chickpeas; finish with lemon.",
            ],
            "nutrition": {"kcal": 540, "protein_g": 22, "carb_g": 68, "fat_g": 18},
            "benefits": ["Plant protein", "Budget-friendly"],
            "tags": ["vegan", "one-pan"],
            "imageUrl": "https://picsum.photos/seed/chickpea/1024/768",
        },
    },
    {
        "id": "r3",
        "title": "Chicken Avocado Wrap",
        "imageUrl": "https://picsum.photos/seed/wrap/512/384",
        "quickFacts": {"kcal": 610, "protein_g": 36, "tags": ["high-protein", "lunch"]},
        "details": {
            "ingredients": [
                {"name": "Tortilla", "qty": "1 large"},
                {"name": "Chicken breast (cooked)", "qty": "150 g"},
                {"name": "Avocado", "qty": "1/2"},
                {"name": "Lettuce", "qty": "a handful"},
                {"name": "Yogurt sauce", "qty": "2 tbsp"},
            ],
            "steps": [
                "Warm tortilla.",
                "Layer chicken, avocado, lettuce; drizzle sauce; roll.",
            ],
            "nutrition": {"kcal": 610, "protein_g": 36, "carb_g": 54, "fat_g": 26},
            "benefits": ["Balanced macros", "Quick meal prep"],
            "tags": ["high-protein", "meal-prep"],
            "imageUrl": "https://picsum.photos/seed/wrap/1024/768",
        },
    },
    {
        "id": "r4",
        "title": "Caprese Pasta Salad",
        "imageUrl": "https://picsum.photos/seed/caprese/512/384",
        "quickFacts": {"kcal": 480, "protein_g": 18, "tags": ["vegetarian", "summer"]},
        "details": {
            "ingredients": [
                {"name": "Pasta", "qty": "120 g"},
                {"name": "Cherry tomatoes", "qty": "1 cup"},
                {"name": "Mozzarella", "qty": "100 g"},
                {"name": "Basil", "qty": "a handful"},
                {"name": "Olive oil", "qty": "1 tbsp"},
            ],
            "steps": [
                "Cook pasta; cool.",
                "Toss with tomatoes, mozzarella, basil, olive oil.",
            ],
            "nutrition": {"kcal": 480, "protein_g": 18, "carb_g": 60, "fat_g": 18},
            "benefits": ["Simple ingredients", "Crowd-pleaser"],
            "tags": ["vegetarian", "make-ahead"],
            "imageUrl": "https://picsum.photos/seed/caprese/1024/768",
        },
    },
]

# UI component resource identifiers and MIME
GALLERY_URI = "ui://dish-gallery.html"
RECIPE_URI = "ui://recipe-card.html"
HTML_MIME = "text/html+skybridge"


def _ui_text(name: str) -> str:
    return Path(__file__).parent.joinpath("ui", name).read_text(encoding="utf-8")


# Expose components as MCP resources so the Apps SDK can render them
@mcp.resource(GALLERY_URI, mimeType=HTML_MIME)
def _gallery_component():
    return _ui_text("dish-gallery.html")


@mcp.resource(RECIPE_URI, mimeType=HTML_MIME)
def _recipe_component():
    return _ui_text("recipe-card.html")


# ----------------------- Tools -----------------------


@mcp.tool(
    name="search_dishes",
    description="Find dishes by simple text/filters and return a clickable gallery.",
)
def search_dishes(
    query: Optional[str] = None,
    ingredients: Optional[List[str]] = None,
    diet: Optional[str] = None,
    cuisine: Optional[str] = None,
    max_results: int = 12,
) -> Dict[str, Any]:
    # For the POC we just filter the static list a tiny bit
    items = MENU
    if query:
        q = query.lower()
        items = [i for i in items if q in i["title"].lower()]
    if ingredients:
        # extremely naive match against ingredient names
        ing = set([s.lower() for s in ingredients])
        items = [
            i
            for i in items
            if any(x["name"].lower() in ing for x in i["details"]["ingredients"])
        ]

    items = items[:max_results]

    # Shape required by Apps SDK: include structured_content and outputTemplate
    return {
        "content": f"Found {len(items)} dishes.",
        "structured_content": {
            "items": [
                {
                    "id": i["id"],
                    "title": i["title"],
                    "imageUrl": i["imageUrl"],
                    "quickFacts": i["quickFacts"],
                }
                for i in items
            ]
        },
        "_meta": {"openai/outputTemplate": GALLERY_URI},
    }


@mcp.tool(
    name="get_recipe",
    description="Return full recipe (ingredients, steps, nutrition, benefits) for a dish id.",
)
def get_recipe(recipe_id: str) -> Dict[str, Any]:
    rec = next((i for i in MENU if i["id"] == recipe_id), None)
    if not rec:
        return {
            "content": "Recipe not found.",
            "structured_content": {"error": "not_found", "recipe_id": recipe_id},
            "_meta": {"openai/outputTemplate": RECIPE_URI},
        }

    payload = {
        "id": rec["id"],
        "title": rec["title"],
        "imageUrl": rec["details"]["imageUrl"],
        "ingredients": rec["details"]["ingredients"],
        "steps": rec["details"]["steps"],
        "nutrition": rec["details"]["nutrition"],
        "benefits": rec["details"]["benefits"],
        "tags": rec["details"]["tags"],
    }

    return {
        "content": f"Recipe for {rec['title']}",
        "structured_content": payload,
        "_meta": {"openai/outputTemplate": RECIPE_URI},
    }


# ------------- HTTP transport for ChatGPT Developer Mode -------------


def build_app() -> FastAPI:
    return create_http_app(mcp)


app = build_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8080")))
