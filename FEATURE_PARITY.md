# Frontend content parity

기존 `public/index.html`의 사용자 기능을 React/Vite 화면으로 옮긴 결과다.

| 기존 내용 | 새 위치 | 상태 |
|---|---|---|
| 한 줄 분석 요청 | Research brief | 유지 |
| 보고서/논문 선택 | 출력 유형 | 유지 |
| fast/live/full 선택 | 실행 파이프라인 | 유지 |
| 실행 및 SSE 수신 | Agent collaboration | 유지 |
| TERRA/CODE/LUNA/SOL/LINER 애니메이션 | 5개 Agent 노드 | 유지 |
| 실행 로그 | Event timeline | 유지 |
| 보고서 JSON/PDF | Run access | 유지 |
| 신뢰도·기간·제목 | 결과 문서 머리말 | 유지 |
| 수출액·YoY·품목 비중·근거 커버리지 | KPI 4종 | 유지 |
| 월별 수출 추이 | 막대 시각화 | 유지 |
| 품목 구성 | 비중 막대 | 유지 |
| 데이터 계보 | Provenance 블록 | 유지 |
| 문장별 검증 상태와 인용 | 보고서 섹션 | 유지 |
| 근거 처리 흐름과 출처 원장 | Evidence chain | 유지 |
| 복수 Liner Visualization | Liner visualizations | 유지 |
| 이상치·잠정치 경고 | 사람이 확인할 지점 | 유지 |

기존 `agent-24-hackathon-frontend_new`에서는 3열 콘솔 레이아웃, 녹색 편집 디자인,
실행 타임라인, 인쇄용 결과 패널, 반응형·접근성 스타일을 가져왔다. 기존 `/research`
API 전용 필드는 현재 백엔드 계약과 맞지 않아 `/runs` 요청·보고서 모델로 교체했다.

