import type { ResearchRequest, RunDetail, RunSummary, TimelineEvent } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

export async function listRuns(): Promise<RunSummary[]> {
  const response = await fetch(`${API_BASE_URL}/research`);
  if (!response.ok) throw new Error("저장된 리서치 목록을 불러오지 못했습니다.");
  return response.json();
}

export async function getRun(runId: string): Promise<RunDetail> {
  const response = await fetch(`${API_BASE_URL}/research/${runId}`);
  if (!response.ok) throw new Error("리서치 결과를 불러오지 못했습니다.");
  return response.json();
}

export async function streamResearch(
  request: ResearchRequest,
  onEvent: (event: TimelineEvent) => void,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/research/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok || !response.body) throw new Error("리서치 실행을 시작하지 못했습니다.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const event = parseSseFrame(frame);
      if (event) onEvent(event);
    }
  }
}

function parseSseFrame(frame: string): TimelineEvent | null {
  const name = frame.match(/^event:\s*(.+)$/m)?.[1];
  const rawData = frame.match(/^data:\s*(.+)$/m)?.[1];
  if (!name || !rawData) return null;

  try {
    const data = JSON.parse(rawData) as { run_id: string; stage: TimelineEvent["stage"]; message: string; payload?: Record<string, unknown> };
    return { id: `${Date.now()}-${Math.random()}`, runId: data.run_id, event: name, stage: data.stage, message: data.message, payload: data.payload, time: new Date() };
  } catch {
    return null;
  }
}
