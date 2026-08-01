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

## Run with Docker

```bash
docker compose up -d --build
```

`http://127.0.0.1:18087` 로 뜬다. 서버에서는 호스트 nginx가 `agent24.hajin.xyz` → `127.0.0.1:18087` 로 넘긴다.

전제조건 — `agent24_network` 가 있어야 한다. 백엔드 DB compose가 만들어주므로, 없으면 먼저:

```bash
cd ../agent-24-hackathon-backend
docker compose -f docker-compose.db.yml up -d   # agent24_network + agent24_db
docker compose up -d --build                    # agent24_api
```

### 구조

```
브라우저 → 호스트 nginx(443) → 127.0.0.1:18087 (agent24-frontend)
                                 ├─ /      : SPA 정적 파일 (try_files → index.html)
                                 └─ /api/  : BACKEND_ORIGIN 으로 프록시 (경로 그대로 전달)
```

Vite는 `import.meta.env` 를 **빌드 타임에 인라인**한다. 그래서 컨테이너 이미지는
`VITE_API_BASE_URL=/api/v1` 상대경로로 굽고, 실제 백엔드 주소는 컨테이너 nginx의
`BACKEND_ORIGIN` 이 런타임에 결정한다. 덕분에 배포 도메인이 바뀌어도 재빌드가 필요 없고,
브라우저 입장에서는 동일 오리진이라 CORS 설정도 필요 없다.

`/api/v1/research/stream` 은 SSE라서 컨테이너 nginx와 호스트 nginx 양쪽 모두
`proxy_buffering off` + `proxy_read_timeout 24h` 로 열어뒀다.

### 환경변수

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `FRONTEND_PORT` | `18087` | 호스트 바인딩 포트 (127.0.0.1 전용) |
| `BACKEND_ORIGIN` | `http://agent24_api:8000` | 컨테이너 nginx가 `/api/` 를 넘길 대상 |

로컬 `.env` 의 `VITE_API_BASE_URL` 은 `npm run dev` 전용이다. `.dockerignore` 로 빌드
컨텍스트에서 제외되므로 이미지 빌드에는 영향을 주지 않는다.
