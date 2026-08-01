import { FormEvent, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { checkResearchAvailability, getRun, listRuns, streamResearch } from "./api";
import type { ReportDraft, ResearchRequest, RunDetail, RunSummary, Stage, TimelineEvent } from "./types";

const stageMeta: Record<Stage, { label: string; detail: string; index: number }> = {
  manager: { label: "Research Manager", detail: "고정된 연구 흐름을 제어합니다.", index: 0 },
  data: { label: "Data Check", detail: "자료 범위·시트·지원 가능 여부를 검사합니다.", index: 0 },
  trade: { label: "Trade Analysis", detail: "분석 질문, 데이터 변화, 특이점을 도출합니다.", index: 1 },
  visualization: { label: "Anomaly Visualization", detail: "상위 20개 이상점을 Liner Viz로 시각화합니다.", index: 2 },
  planner: { label: "Report Planning", detail: "핵심 이상점과 보고서 구성을 결정합니다.", index: 3 },
  news: { label: "News & Policy", detail: "선택된 특이점의 뉴스·정책 근거를 조사합니다.", index: 4 },
  rca: { label: "RCA Analysis", detail: "비교우위·원인·경제적 영향을 분석합니다.", index: 5 },
  writer: { label: "Report Writer", detail: "근거를 구조화된 보고서로 작성합니다.", index: 6 },
  qa: { label: "Final QA", detail: "수치·출처·논리·구조를 점검합니다.", index: 7 },
  completed: { label: "Complete", detail: "최종 보고서가 준비됐습니다.", index: 8 },
  error: { label: "Pipeline error", detail: "실행이 중단됐습니다.", index: 8 },
};

const initialRequest: ResearchRequest = {
  countries: ["중국"],
  products: ["반도체"],
  unit: "USD",
  length: 1200,
  start_period: "2025-04",
  end_period: "2025-06",
};

const countryOptions = ["중국", "미국", "아세안", "EU", "일본", "독일", "인도", "중동", "중남미", "CIS"];
const productOptions = [
  "반도체", "컴퓨터", "디스플레이", "무선통신기기", "자동차", "자동차부품", "선박",
  "석유제품", "석유화학", "이차전지", "일반기계", "철강", "비철금속", "전기기기",
  "바이오헬스", "화장품", "농수산식품", "섬유", "가전", "생활용품",
];

function App() {
  const [request, setRequest] = useState(initialRequest);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [selectedRun, setSelectedRun] = useState<RunDetail | null>(null);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [inspectedStage, setInspectedStage] = useState<Stage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noDataMessage, setNoDataMessage] = useState<string | null>(null);

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
    if (!request.countries.length || !request.products.length) {
      setError("최소 한 개의 국가와 품목을 선택하거나 입력하세요.");
      return;
    }
    if (request.start_period > request.end_period) {
      setError("종료 월은 시작 월보다 빠를 수 없습니다.");
      return;
    }
    setError(null);
    try {
      const availability = await checkResearchAvailability(request);
      if (!availability.available) {
        setNoDataMessage(availability.message);
        return;
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "데이터 확인 중 오류가 발생했습니다.");
      return;
    }
    setLoading(true);
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
      if (detail.status !== "completed" || !detail.result) {
        const message = detail.error_message ?? "리서치가 완료되기 전에 중단되어 보고서를 만들지 못했습니다.";
        setError(message);
        if (isDataUnavailable(message)) setNoDataMessage(message);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function selectRun(runId: string) {
    try {
      setError(null);
      const detail = await getRun(runId);
      setSelectedRun(detail);
      if (detail.status !== "completed" || !detail.result) {
        setError(detail.error_message ?? "이 실행에는 생성된 보고서가 없습니다.");
      }
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
      {noDataMessage && <NoDataModal message={noDataMessage} onClose={() => setNoDataMessage(null)} />}

      <section className="hero">
        <div>
          <p className="eyebrow">MULTI-AGENT RESEARCH</p>
          <h1>무역의 변화가<br /><em>어디에서 시작됐는지.</em></h1>
        </div>
        <p className="hero-copy">데이터 특이점부터 뉴스, RCA 분석, 검증된 보고서까지. 각 단계의 공개 작업 로그와 산출물을 한 화면에서 확인합니다.</p>
      </section>

      <section className="workspace">
        <aside className="control-rail">
          <form onSubmit={startResearch} className="research-form">
            <div className="form-heading"><span>01</span><h2>Research brief</h2></div>
            <MultiSelectInput id="countries" label="국가·지역" values={request.countries} options={countryOptions} placeholder="선택하거나 직접 입력" onChange={(countries) => setRequest({ ...request, countries })} />
            <MultiSelectInput id="products" label="품목" values={request.products} options={productOptions} placeholder="선택하거나 직접 입력" onChange={(products) => setRequest({ ...request, products })} />
            <div className="two-up">
              <label>표시 단위<select value={request.unit} onChange={(event) => setRequest({ ...request, unit: event.target.value })}><option value="USD">USD</option><option value="KRW">KRW</option><option value="thousand USD">천 USD</option></select></label>
              <label>분량<input type="number" min="300" max="5000" value={request.length} onChange={(event) => setRequest({ ...request, length: Number(event.target.value) })} /></label>
            </div>
            <div className="date-range" role="group" aria-label="분석 기간">
              <span>분석 기간</span>
              <div className="two-up">
                <label>시작 월<input className="calendar-input" type="month" value={request.start_period} max={request.end_period} onChange={(event) => setRequest({ ...request, start_period: event.target.value })} /></label>
                <label>종료 월<input className="calendar-input" type="month" value={request.end_period} min={request.start_period} onChange={(event) => setRequest({ ...request, end_period: event.target.value })} /></label>
              </div>
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
          <div className="panel-heading"><div><span className="section-kicker">LIVE EXECUTION</span><h2>Generation timeline</h2></div><span className="step-count">{Math.min(stageMeta[activeStage].index + 1, 8)} / 8</span></div>
          <div className="timeline">
            {(["data", "trade", "visualization", "planner", "news", "rca", "writer", "qa"] as Stage[]).map((stage) => {
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

function NoDataModal({ message, onClose }: { message: string; onClose: () => void }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="data-modal" role="dialog" aria-modal="true" aria-labelledby="data-modal-title" onMouseDown={(event) => event.stopPropagation()}>
      <span className="section-kicker">STEP 0 · DATA CHECK</span>
      <h2 id="data-modal-title">선택한 범위에<br />사용 가능한 데이터가 없습니다.</h2>
      <p>{message}</p>
      <p className="modal-note">국가·품목·기간을 변경한 뒤 다시 확인하세요. 데이터가 없으면 에이전트 실행을 시작하지 않습니다.</p>
      <button type="button" className="modal-button" onClick={onClose}>조건 수정하기 <span>←</span></button>
    </section>
  </div>;
}

function MultiSelectInput({
  id,
  label,
  values,
  options,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  values: string[];
  options: string[];
  placeholder: string;
  onChange: (values: string[]) => void;
}) {
  const [input, setInput] = useState("");

  function addInput() {
    const additions = splitList(input).filter((value) => !values.includes(value));
    if (additions.length) onChange([...values, ...additions]);
    setInput("");
  }

  return <label className="selection-field">
    <span>{label}</span>
    <div className="selection-control">
      {values.map((value) => <span className="selection-chip" key={value}>{value}<button type="button" onClick={() => onChange(values.filter((item) => item !== value))} aria-label={`${value} 제거`}>×</button></span>)}
      <input aria-label={`${label} 선택 또는 입력`} list={`${id}-options`} value={input} placeholder={placeholder} onChange={(event) => setInput(event.target.value)} onBlur={addInput} onKeyDown={(event) => { if (event.key === "Enter" || event.key === ",") { event.preventDefault(); addInput(); } }} />
    </div>
    <datalist id={`${id}-options`}>{options.filter((option) => !values.includes(option)).map((option) => <option value={option} key={option} />)}</datalist>
    <small>목록에서 선택하거나 입력 후 Enter</small>
  </label>;
}

function ReportView({ run }: { run: RunDetail }) {
  const report = run.result!.report;
  return <article className="report-document"><div className="report-meta"><span>RUN {run.id.slice(0, 8).toUpperCase()}</span><span>{run.request.start_period} — {run.request.end_period}</span></div>{report.markdown.trim() ? <div className="markdown-content"><ReactMarkdown remarkPlugins={[remarkGfm]}>{report.markdown}</ReactMarkdown></div> : <StructuredReport report={report} />}</article>;
}

function StructuredReport({ report }: { report: ReportDraft }) {
  return <><h2>{report.title}</h2><p className="executive-summary">{report.executive_summary}</p>{report.sections.map((section) => <section key={section.heading}><h3>{section.heading}</h3><p>{section.content}</p></section>)}<section><h3>결론</h3><p>{report.conclusion}</p></section>{report.limitations.length > 0 && <section className="limitations"><h3>해석의 한계</h3><ul>{report.limitations.map((item) => <li key={item}>{item}</li>)}</ul></section>}<footer className="references"><h3>References</h3>{report.references.length ? <ol>{report.references.map((reference) => <li key={reference}>{reference}</li>)}</ol> : <p>보고서에 포함된 근거를 검토하세요.</p>}</footer></>;
}

function StageInspector({ stage, output, onClose }: { stage: Stage; output: unknown; onClose: () => void }) {
  const visualization = stage === "visualization" && isRecord(output) && typeof output.html === "string" ? output : null;
  return <section className="stage-inspector" aria-label={`${stageMeta[stage].label} 전체 출력`}><div><span className="section-kicker">FULL STRUCTURED OUTPUT</span><h3>{stageMeta[stage].label}</h3></div><button type="button" className="close-inspector" onClick={onClose} aria-label="전체 출력 닫기">×</button>{visualization && <iframe className="visualization-frame" sandbox="allow-scripts" srcDoc={visualization.html as string} title="Trade anomaly visualization" />}{output ? <OutputTree value={output} /> : <p>이 단계의 출력은 아직 준비되지 않았습니다. 완료된 단계 또는 저장된 실행을 선택하세요.</p>}</section>;
}

function OutputTree({ value }: { value: unknown }) {
  return <div className="output-tree"><JsonNode label="Agent output" value={value} depth={0} /></div>;
}

function JsonNode({ label, value, depth }: { label: string; value: unknown; depth: number }) {
  if (Array.isArray(value)) {
    return <details className="tree-branch" open={depth < 1}><summary><span>{humanize(label)}</span><b>LIST · {value.length}</b></summary><div className="tree-children">{value.length ? value.map((item, index) => <JsonNode key={index} label={`Item ${index + 1}`} value={item} depth={depth + 1} />) : <span className="tree-empty">비어 있음</span>}</div></details>;
  }
  if (isRecord(value)) {
    const entries = Object.entries(value);
    return <details className="tree-branch" open={depth < 1}><summary><span>{humanize(label)}</span><b>OBJECT · {entries.length}</b></summary><div className="tree-children">{entries.map(([key, item]) => <JsonNode key={key} label={key} value={item} depth={depth + 1} />)}</div></details>;
  }
  const text = formatPrimitive(value);
  return <div className={`tree-leaf ${text.length > 110 ? "long" : ""}`}><span>{humanize(label)}</span><p>{text}</p></div>;
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
    data: run.result.data_check,
    trade: run.result.trade_analysis,
    visualization: run.result.visualization,
    planner: run.result.report_plan,
    news: run.result.news_analysis,
    rca: run.result.rca_analysis,
    writer: run.result.report,
    qa: run.result.qa,
  };
  return storedOutput[stage] ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function formatPrimitive(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return value;
  return String(value);
}

function humanize(value: string): string {
  return value.replaceAll("_", " ").replace(/([a-z])([A-Z])/g, "$1 $2");
}

function splitList(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function isDataUnavailable(message: string): boolean {
  return message.includes("일치하는 무역 데이터가 없습니다");
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(new Date(value));
}

export default App;
