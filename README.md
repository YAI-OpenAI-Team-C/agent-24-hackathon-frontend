# AGENT:24 Frontend

기존 AGENT:24 콘솔 디자인을 현재 관세 브리핑 API에 연결한 React/Vite 프론트엔드다.
백엔드를 `http://127.0.0.1:8000`에서 실행한 뒤 개발 서버를 시작한다.

```powershell
npm install
npm run dev
```

기본 API는 `http://127.0.0.1:8000/api/v1`이다. 다른 주소는 `.env`의
`VITE_API_BASE_URL`로 지정한다.

## Docker deployment

백엔드와 DB가 `agent24_network`에서 실행 중이면 다음 명령으로 Nginx 프론트를 띄운다.

```bash
docker compose up -d --build
```

Docker 빌드는 `VITE_API_BASE_URL=/api/v1`을 사용한다. Nginx가 `/api/` 요청을
`BACKEND_ORIGIN`으로 프록시하고 SSE 버퍼링을 끄므로 실행 이벤트가 실시간으로 표시된다.

## 포함 범위

- 보고서/논문 및 `fast` 파이프라인 선택
- SSE 진행 상태
- TERRA, CODE, LUNA, SOL, LINER 협업 애니메이션
- 결과 차트, 근거 원장, PDF 링크
