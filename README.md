# SmartBuy AI — Live Product Comparison Demo

SmartBuy AI is a React + FastAPI app that searches live Google Shopping results, ranks the best matches, and uses an AI decision layer to explain the strongest option. When live search is unavailable, it falls back to the local mock catalog so the app still works.

## Architecture

```text
React Frontend (port 3000)
        ↓  POST /api/search
FastAPI Backend (port 8000)
        ↓
 ┌──────────────────────────────┐
 │  Search Pipeline             │
 │  1. Query Parser             │
 │  2. Google Shopping Search   │
 │  3. Fallback Catalog         │
 │  4. Data Normalizer          │
 │  5. Matching Engine          │
 │  6. AI Decision Engine       │
 └──────────────────────────────┘
```

## Project Structure

```text
smartbuy-ai/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app + CORS + .env loading
│   │   ├── routes/
│   │   │   └── search.py            # POST /api/search
│   │   ├── services/
│   │   │   ├── shopping_search.py   # SerpApi Google Shopping integration
│   │   │   ├── fallback.py          # mock_data.json catalog loader
│   │   │   ├── currency.py          # USD → INR conversion helpers
│   │   │   ├── normalizer.py        # clean and validate product dicts
│   │   │   ├── matcher.py           # relevance ranking
│   │   │   └── ai_agent.py          # Anthropic Claude / rule-based decision
│   │   └── data/
│   │       └── mock_data.json
│   ├── requirements.txt
│   ├── run.py
│   ├── .env
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── hooks/
│   │   │   └── useSearch.js
│   │   └── components/
│   │       ├── HeroHeader.jsx
│   │       ├── SearchBar.jsx
│   │       ├── ProductCard.jsx
│   │       ├── ExplanationBox.jsx
│   │       └── LoadingSkeleton.jsx
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
└── .gitignore
```

## Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- A SerpApi key for live Google Shopping search
- Optional: an Anthropic API key for Claude reasoning

### Backend

```bash
cd backend

python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Required for live results:
#   SERPAPI_API_KEY=...
# Optional:
#   ANTHROPIC_API_KEY=...
#   USD_TO_INR_RATE=92.40

python run.py
```

Backend runs on `http://localhost:8000`.

### Frontend

```bash
cd frontend

npm install
npm run dev
```

Frontend runs on `http://localhost:3000`.

## API

### `POST /api/search`

Request:

```json
{ "query": "iPhone 13" }
```

Successful response:

```json
{
  "query": "iPhone 13",
  "best": {
    "title": "Apple iPhone 13 128GB",
    "price": 52999,
    "currency": "INR",
    "rating": 4.6,
    "source": "Flipkart",
    "url": "https://www.google.com/shopping/product/...",
    "delivery": "Free delivery",
    "reviews_count": 3210,
    "in_stock": true,
    "thumbnail": "https://...",
    "snippet": "128 GB storage",
    "relevance_score": 0.8735
  },
  "results": [
    /* ranked live results including the best product */
  ],
  "explanation": "Selected **Apple iPhone 13 128GB** ...",
  "data_source": "google-shopping",
  "decision_source": "rule-based",
  "currency": "INR",
  "exchange_rate_usd_to_inr": 92.4,
  "took_ms": 420
}
```

If live search is unavailable, the backend falls back to the mock catalog and returns `"data_source": "mock"`.

No-match response:

```json
{
  "detail": "No matching products found for this query."
}
```

### `GET /health`

Returns:

```json
{ "status": "ok", "service": "SmartBuy AI" }
```

## Search Behavior

- The backend searches SerpApi Google Shopping first using the query from the UI.
- The old “number of options to compare” input is gone; the API always returns the best ranked set automatically.
- Live results are normalized into the same structure the frontend already uses.
- When live search is unavailable, the backend falls back to `backend/app/data/mock_data.json`.
- Any USD-priced fallback data is converted to INR before it reaches the frontend.

## AI Decision Engine

| Mode | When active | How it works |
|------|-------------|--------------|
| Claude AI | `ANTHROPIC_API_KEY` set | Sends matched products to Anthropic and returns the chosen product plus reasoning |
| Rule-based | No AI key configured or AI call fails | Scores products using relevance, rating, and relative price |

## Notes

- `backend/.env` is loaded automatically when the FastAPI app starts.
- `SERPAPI_API_KEY` is the switch for live shopping search.
- `SERPAPI_GL` defaults to `in`, so prices come back in the India market when available.
- `USD_TO_INR_RATE` defaults to `92.40` and is mainly used for mock fallback products.
- Local folders such as `backend/.venv`, `frontend/node_modules`, and `frontend/dist` are intentionally ignored rather than deleted.
