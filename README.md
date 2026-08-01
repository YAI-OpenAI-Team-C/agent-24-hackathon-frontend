# AGENT:24 Frontend

## Run locally

1. Start the backend at `http://127.0.0.1:8000`.
2. Copy `.env.example` to `.env` and change `VITE_API_BASE_URL` only when the backend uses another address.
3. Install and start the dashboard:

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

The dashboard posts research requests to `/research/stream`, parses its Server-Sent Events in real time, and loads completed reports from `/research/{run_id}`.
