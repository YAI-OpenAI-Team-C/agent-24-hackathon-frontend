import type { ContextEstimate, FilterOptions, Report, RunAccepted, RunRequest, TimelineEvent, AgentKey } from "./types";

export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8001/api/v1";

export async function createRun(request: RunRequest): Promise<RunAccepted> {
  const response = await fetch(`${API_BASE}/runs`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function getFilterOptions():Promise<FilterOptions> {
  const response=await fetch(`${API_BASE}/runs/meta/options`); if(!response.ok) throw new Error("필터 목록을 불러오지 못했습니다."); return response.json();
}

export async function estimateContext(request:RunRequest):Promise<ContextEstimate> {
  const response=await fetch(`${API_BASE}/runs/context-estimate`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(request)});
  if(!response.ok) throw new Error("컨텍스트 크기를 계산하지 못했습니다."); return response.json();
}

export async function getReport(id: string): Promise<Report> {
  const response = await fetch(`${API_BASE}/runs/${id}/report`);
  if (!response.ok) throw new Error("결과 보고서를 불러오지 못했습니다.");
  const body = await response.json();
  if (!body.report) throw new Error(body.error || "보고서가 아직 준비되지 않았습니다.");
  return body.report;
}

export function pdfUrl(id: string): string { return `${API_BASE}/runs/${id}/report.pdf`; }

export async function streamEvents(id: string, onEvent: (event: TimelineEvent) => void): Promise<void> {
  const response = await fetch(`${API_BASE}/runs/${id}/events`, { headers: { Accept: "text/event-stream" } });
  if (!response.ok || !response.body) throw new Error("실행 이벤트 연결에 실패했습니다.");
  const reader = response.body.getReader(), decoder = new TextDecoder(); let buffer = "", last = -1;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    buffer += decoder.decode(value, { stream: true }); const frames = buffer.split("\n\n"); buffer = frames.pop() ?? "";
    for (const frame of frames) {
      if (!frame.trim() || frame.startsWith(":")) continue;
      const seq = Number(frame.match(/^id:\s*(.+)$/m)?.[1]); const name = frame.match(/^event:\s*(.+)$/m)?.[1] ?? "event";
      if (!Number.isFinite(seq) || seq <= last) continue; last = seq;
      const raw = frame.match(/^data:\s*(.+)$/m)?.[1] ?? "{}"; let payload = {}; try { payload = JSON.parse(raw); } catch { /* raw SDK event */ }
      const stage = name.match(/(?:pipeline\.)?(\d\d[a-z]?_\w+)/)?.[1] ?? name; onEvent({ id: seq, name, payload, stage, agent: agentFor(name, stage) });
    }
  }
}

function agentFor(name: string, stage: string): AgentKey {
  if (stage.startsWith("01_") || stage.startsWith("06_")) return "terra";
  if (stage.startsWith("02_") || stage.startsWith("04_") || stage.startsWith("03a_")) return "luna";
  if (stage.startsWith("03b_") || stage.startsWith("03c_") || stage.startsWith("03_")) return "sol";
  if (stage.startsWith("05_") || /liner|tool_call|tool_output/i.test(name)) return "liner";
  return "code";
}
