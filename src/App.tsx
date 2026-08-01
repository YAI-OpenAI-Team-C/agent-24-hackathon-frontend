import { FormEvent, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getRun, listRuns, streamResearch } from "./api";
import type { ReportDraft, ResearchRequest, RunDetail, RunSummary, Stage, TimelineEvent } from "./types";

const stageMeta: Record<Stage, { label: string; detail: string; index: number }> = {
  manager: { label: "Research Manager", detail: "입력 범위를 정리하고 실행을 제어합니다.", index: 0 },
  planner: { label: "Planner", detail: "연구 질문과 보고서 구성을 설계합니다.", index: 1 },
  trade: { label: "Trade Analysis", detail: "데이터 변화와 특이점을 계산·해석합니다.", index: 2 },
  news: { label: "News & Policy", detail: "특이점의 뉴스·정책 근거를 조사합니다.", index: 3 },
  gvc: { label: "GVC Analysis", detail: "공급망과 산업 영향을 통합합니다.", index: 4 },
  writer: { label: "Report Writer", detail: "근거를 구조화된 보고서로 작성합니다.", index: 5 },
  qa: { label: "Final QA", detail: "수치·출처·논리·구조를 점검합니다.", index: 6 },
  completed: { label: "Complete", detail: "최종 보고서가 준비됐습니다.", index: 7 },
  error: { label: "Pipeline error", detail: "실행이 중단됐습니다.", index: 7 },
};

const initialRequest: ResearchRequest = {
  countries: ["중국"],
  products: ["반도체"],
  unit: "USD",
  length: 1200,
  start_period: "2025-04",
  end_period: "2025-06",
};

function App() {
  const [request, setRequest] = useState(initialRequest);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [selectedRun, setSelectedRun] = useState<RunDetail | null>(null);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [inspectedStage, setInspectedStage] = useState<Stage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listRuns().then(setRuns).catch(() => undefined);
  }, []);

  const activeStage = useMemo<Stage>(() => {
    const last = events.at(-1);
    if (last?.stage) return last.stage;
    if (selectedRun?.status === "completed") return "completed";
    return "manager";
  }, [events, selectedRun]);

  async function startResearch(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setEvents([]);
    setSelectedRun(null);
    setInspectedStage(null);
    let runId = "";

    try {
      await streamResearch(request, (timelineEvent) => {
        runId ||= timelineEvent.runId;
        setEvents((current) => [...current, timelineEvent]);
      });
      const detail = await getRun(runId);
      setSelectedRun(detail);
      setRuns((current) => [detail, ...current.filter((run) => run.id !== detail.id)]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function selectRun(runId: string) {
    try {
      setError(null);
      setSelectedRun(await getRun(runId));
      setEvents([]);
      setInspectedStage(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "보고서를 불러오지 못했습니다.");
    }
  }

  return (
    <main className="app-shell">
      <a className="skip-link" href="#report">보고서로 건너뛰기</a>
      <header className="topbar">
        <div className="brand"><span className="brand-mark">24</span><span>AGENT:24</span></div>
        <p>TRADE INTELLIGENCE / RESEARCH CONSOLE</p>
        <span className={`system-state ${loading ? "live" : ""}`}>{loading ? "LIVE RUN" : "SYSTEM READY"}</span>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">MULTI-AGENT RESEARCH</p>
          <h1>무역의 변화가<br /><em>어디에서 시작됐는지.</em></h1>
        </div>
        <p className="hero-copy">데이터 특이점부터 뉴스, GVC 해석, 검증된 보고서까지. 각 단계의 공개 작업 로그와 산출물을 한 화면에서 확인합니다.</p>
      </section>

      <section className="workspace">
        <aside className="control-rail">
          <form onSubmit={startResearch} className="research-form">
            <div className="form-heading"><span>01</span><h2>Research brief</h2></div>
            <label>국가<input value={request.countries.join(", ")} onChange={(event) => setRequest({ ...request, countries: splitList(event.target.value) })} /></label>
            <label>품목<input value={request.products.join(", ")} onChange={(event) => setRequest({ ...request, products: splitList(event.target.value) })} /></label>
            <div className="two-up">
              <label>단위<input value={request.unit} onChange={(event) => setRequest({ ...request, unit: event.target.value })} /></label>
              <label>분량<input type="number" min="300" max="5000" value={request.length} onChange={(event) => setRequest({ ...request, length: Number(event.target.value) })} /></label>
            </div>
            <div className="two-up">
              <label>시작<input type="month" value={request.start_period} onChange={(event) => setRequest({ ...request, start_period: event.target.value })} /></label>
              <label>종료<input type="month" value={request.end_period} onChange={(event) => setRequest({ ...request, end_period: event.target.value })} /></label>
            </div>
            <button className="run-button" disabled={loading} type="submit">{loading ? "ANALYZING…" : "START RESEARCH"}<span>↗</span></button>
          </form>

          <div className="run-history">
            <div className="form-heading"><span>02</span><h2>Saved runs</h2></div>
            {runs.length === 0 ? <p className="empty-note">저장된 실행이 없습니다.</p> : runs.slice(0, 5).map((run) => (
              <button key={run.id} className={`run-item ${selectedRun?.id === run.id ? "selected" : ""}`} onClick={() => selectRun(run.id)}>
                <span className={`dot ${run.status}`} />
                <span>{run.current_stage ?? "completed"}<small>{formatDate(run.created_at)}</small></span><span>›</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="analysis-panel" aria-live="polite">
          <div className="panel-heading"><div><span className="section-kicker">LIVE EXECUTION</span><h2>Generation timeline</h2></div><span className="step-count">{Math.min(stageMeta[activeStage].index + 1, 7)} / 7</span></div>
          <div className="timeline">
            {(["planner", "trade", "news", "gvc", "writer", "qa"] as Stage[]).map((stage) => {
              const stageEvents = events.filter((item) => item.stage === stage);
              const isCurrent = stage === activeStage;
              const isComplete = stageEvents.some((item) => item.event === "stage_completed") || stageMeta[activeStage].index > stageMeta[stage].index;
              return <button type="button" aria-pressed={inspectedStage === stage} className={`timeline-item ${isCurrent ? "current" : ""} ${isComplete ? "complete" : ""} ${inspectedStage === stage ? "inspected" : ""}`} key={stage} onClick={() => setInspectedStage(stage)}>
                <div className="timeline-pin"><span /></div>
                <div className="timeline-content"><div className="timeline-title"><span>{String(stageMeta[stage].index).padStart(2, "0")}</span><h3>{stageMeta[stage].label}</h3><b>{isCurrent ? "RUNNING" : isComplete ? "DONE" : "QUEUED"}</b></div><p>{latestMessage(stageEvents) ?? stageMeta[stage].detail}</p>{stageEvents.at(-1)?.payload && <PayloadSummary payload={stageEvents.at(-1)?.payload} />}</div>
              </button>;
            })}
          </div>
          {inspectedStage && <StageInspector stage={inspectedStage} output={getStageOutput(inspectedStage, events, selectedRun)} onClose={() => setInspectedStage(null)} />}
          {error && <div className="error-box">{error}</div>}
          <p className="process-note">작업 로그는 Agent가 반환한 단계 상태와 근거 요약입니다. 비공개 내부 추론은 표시하지 않습니다.</p>
        </section>

        <section id="report" className="report-panel">
          <div className="panel-heading"><div><span className="section-kicker">FINAL OUTPUT</span><h2>Research report</h2></div>{selectedRun?.result && <button className="print-button" onClick={() => window.print()}>PRINT ↗</button>}</div>
          {selectedRun?.result ? <ReportView run={selectedRun} /> : <ReportEmpty loading={loading} />}
        </section>
      </section>
    </main>
  );
}

function ReportView({ run }: { run: RunDetail }) {
  const report = run.result!.report;
  return <article className="report-document"><div className="report-meta"><span>RUN {run.id.slice(0, 8).toUpperCase()}</span><span>{run.request.start_period} — {run.request.end_period}</span></div>{report.markdown.trim() ? <div className="markdown-content"><ReactMarkdown remarkPlugins={[remarkGfm]}>{report.markdown}</ReactMarkdown></div> : <StructuredReport report={report} />}</article>;
}

function StructuredReport({ report }: { report: ReportDraft }) {
  return <><h2>{report.title}</h2><p className="executive-summary">{report.executive_summary}</p>{report.sections.map((section) => <section key={section.heading}><h3>{section.heading}</h3><p>{section.content}</p></section>)}<section><h3>결론</h3><p>{report.conclusion}</p></section>{report.limitations.length > 0 && <section className="limitations"><h3>해석의 한계</h3><ul>{report.limitations.map((item) => <li key={item}>{item}</li>)}</ul></section>}<footer className="references"><h3>References</h3>{report.references.length ? <ol>{report.references.map((reference) => <li key={reference}>{reference}</li>)}</ol> : <p>보고서에 포함된 근거를 검토하세요.</p>}</footer></>;
}

function StageInspector({ stage, output, onClose }: { stage: Stage; output: unknown; onClose: () => void }) {
  return <section className="stage-inspector" aria-label={`${stageMeta[stage].label} 전체 출력`}><div><span className="section-kicker">FULL STRUCTURED OUTPUT</span><h3>{stageMeta[stage].label}</h3></div><button type="button" className="close-inspector" onClick={onClose} aria-label="전체 출력 닫기">×</button>{output ? <pre>{JSON.stringify(output, null, 2)}</pre> : <p>이 단계의 출력은 아직 준비되지 않았습니다. 완료된 단계 또는 저장된 실행을 선택하세요.</p>}</section>;
}

function ReportEmpty({ loading }: { loading: boolean }) {
  return <div className="report-empty"><div className={`empty-orbit ${loading ? "spinning" : ""}`}><span /></div><h3>{loading ? "보고서를 조립하고 있습니다" : "아직 보고서가 없습니다"}</h3><p>{loading ? "실시간 타임라인에서 현재 단계를 확인하세요." : "왼쪽에서 분석 범위를 설정하고 리서치를 시작하세요."}</p></div>;
}

function PayloadSummary({ payload }: { payload?: Record<string, unknown> }) {
  if (!payload) return null;
  const keys = Object.keys(payload).filter((key) => !["data_points", "markdown"].includes(key)).slice(0, 3);
  if (!keys.length) return null;
  return <div className="payload-summary">{keys.map((key) => <span key={key}>{key.replaceAll("_", " ")}</span>)}</div>;
}

function latestMessage(events: TimelineEvent[]): string | undefined {
  return events.at(-1)?.message;
}

function getStageOutput(stage: Stage, events: TimelineEvent[], run: RunDetail | null): unknown {
  const liveOutput = events.slice().reverse().find((event) => event.stage === stage && event.payload)?.payload;
  if (liveOutput) return liveOutput;
  if (!run?.result) return null;
  const storedOutput: Partial<Record<Stage, unknown>> = {
    planner: run.result.plan,
    trade: run.result.trade_analysis,
    news: run.result.news_analysis,
    gvc: run.result.gvc_analysis,
    writer: run.result.report,
    qa: run.result.qa,
  };
  return storedOutput[stage] ?? null;
}

function splitList(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(new Date(value));
}

export default App;
