import { FormEvent, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./prompt.css";
import { checkResearchAvailability, getChartImageUrl, getRun, listRuns, streamResearch } from "./api";
import type { ChartArtifact, ReportDraft, ResearchDataAvailability, ResearchRequest, RunDetail, RunSummary, Stage, TimelineEvent, VisualizationResult } from "./types";

const stageMeta: Record<Stage, { label: string; detail: string; index: number }> = {
  manager: { label: "Research Manager", detail: "고정된 연구 흐름을 제어합니다.", index: 0 },
  data: { label: "Data Check", detail: "자료 범위·시트·지원 가능 여부를 검사합니다.", index: 0 },
  trade: { label: "Trade + Anomaly Detection", detail: "경제 지표를 계산하고 통계·경제적 이상점을 순위화합니다.", index: 1 },
  visualization: { label: "Visual Exploration", detail: "최소 8개의 재현 가능한 탐색 차트와 선택적 인터랙티브 뷰를 생성합니다.", index: 2 },
  news: { label: "News & Policy", detail: "시각화된 특이점의 뉴스·정책 근거를 조사합니다.", index: 3 },
  rca: { label: "Deep Research", detail: "차트 근거와 이상점을 외부 자료·학술 근거에 연결합니다.", index: 4 },
  planner: { label: "Report Planning", detail: "모든 근거를 바탕으로 핵심 서사와 4–6개 그림을 결정합니다.", index: 5 },
  writer: { label: "Report Writer", detail: "근거를 구조화된 보고서로 작성합니다.", index: 6 },
  qa: { label: "Final QA", detail: "수치·출처·논리·구조를 점검합니다.", index: 7 },
  completed: { label: "Complete", detail: "최종 보고서가 준비됐습니다.", index: 8 },
  error: { label: "Pipeline error", detail: "실행이 중단됐습니다.", index: 8 },
};

const initialRequest: ResearchRequest = {
  countries: ["중국"],
  products: ["반도체"],
  unit: "USD",
  length: 1500,
  word_count: 300,
  start_period: "2025-04",
  end_period: "2025-06",
};

const countryOptions = ["중국", "미국", "아세안", "EU", "일본", "독일", "인도", "중동", "중남미", "CIS"];
const productOptions = [
  "반도체", "컴퓨터", "디스플레이", "무선통신기기", "자동차", "자동차부품", "선박",
  "석유제품", "석유화학", "이차전지", "일반기계", "철강", "비철금속", "전기기기",
  "바이오헬스", "화장품", "농수산식품", "섬유", "가전", "생활용품",
];
const ALL_SCOPE_VALUE = "__all__";

function App() {
  const [request, setRequest] = useState(initialRequest);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [selectedRun, setSelectedRun] = useState<RunDetail | null>(null);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [inspectedStage, setInspectedStage] = useState<Stage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noDataMessage, setNoDataMessage] = useState<string | null>(null);
  const [dataContext, setDataContext] = useState<ResearchDataAvailability | null>(null);

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
      setDataContext(availability);
      if (!availability.available) {
        setNoDataMessage(availability.message);
        return;
      }
      if (!availability.context_safe) {
        setError(availability.message);
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
              <label>목표 단어 수<select value={request.word_count == null ? "any" : "target"} onChange={(event) => { if (event.target.value === "any") setRequest({ ...request, word_count: undefined }); else { const wordCount = request.word_count ?? 300; setRequest({ ...request, word_count: wordCount, length: Math.min(5000, Math.max(300, wordCount * 5)) }); } }}><option value="target">직접 지정</option><option value="any">제한 없음</option></select>{request.word_count == null ? <small className="field-note">단어 수는 QA에서 제한하지 않습니다.</small> : <input type="number" min="100" max="2000" value={request.word_count} onChange={(event) => { const wordCount = Number(event.target.value); setRequest({ ...request, word_count: wordCount || undefined, length: wordCount ? Math.min(5000, Math.max(300, wordCount * 5)) : request.length }); }} />}</label>
            </div>
            <label className="prompt-field">추가 연구 지시<textarea value={request.additional_prompt ?? ""} maxLength={2000} placeholder="예: 독일 수입 증가의 의미를 자세히 설명하고, 정책 제안은 제외하세요." onChange={(event) => setRequest({ ...request, additional_prompt: event.target.value || undefined })} /><small>보고서의 초점·독자·포함하거나 제외할 내용을 입력하세요. 자료에 없는 사실은 추가되지 않습니다.</small></label>
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
            {(["data", "trade", "visualization", "news", "rca", "planner", "writer", "qa"] as Stage[]).map((stage) => {
              const stageEvents = events.filter((item) => item.stage === stage);
              const isCurrent = stage === activeStage;
              const isComplete = stageEvents.some((item) => item.event === "stage_completed") || stageMeta[activeStage].index > stageMeta[stage].index;
              return <button type="button" aria-pressed={inspectedStage === stage} className={`timeline-item ${isCurrent ? "current" : ""} ${isComplete ? "complete" : ""} ${inspectedStage === stage ? "inspected" : ""}`} key={stage} onClick={() => setInspectedStage(stage)}>
                <div className="timeline-pin"><span /></div>
                <div className="timeline-content"><div className="timeline-title"><span>{String(stageMeta[stage].index).padStart(2, "0")}</span><h3>{stageMeta[stage].label}</h3><b>{isCurrent ? "RUNNING" : isComplete ? "DONE" : "QUEUED"}</b></div><p>{latestMessage(stageEvents) ?? stageMeta[stage].detail}</p>{stage === "data" && <DataContextMeter context={contextForStage(stageEvents, selectedRun) ?? dataContext} />}{stageEvents.at(-1)?.payload && <PayloadSummary payload={stageEvents.at(-1)?.payload} />}</div>
              </button>;
            })}
          </div>
          {inspectedStage && <StageInspector stage={inspectedStage} output={getStageOutput(inspectedStage, events, selectedRun)} run={selectedRun} onClose={() => setInspectedStage(null)} />}
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

type ContextMeterData = Pick<ResearchDataAvailability, "estimated_context_tokens" | "context_budget_tokens" | "context_usage_percent" | "context_level" | "context_safe"> & {
  matching_record_count?: number;
  selected_record_count?: number;
};

function contextForStage(events: TimelineEvent[], run: RunDetail | null): ContextMeterData | null {
  const payload = events.at(-1)?.payload;
  if (hasContextMetrics(payload)) return payload;
  const dataCheck = run?.result?.data_check;
  return hasContextMetrics(dataCheck) ? dataCheck : null;
}

function hasContextMetrics(value: unknown): value is ContextMeterData {
  if (!value || typeof value !== "object") return false;
  const metrics = value as Record<string, unknown>;
  return typeof metrics.estimated_context_tokens === "number"
    && typeof metrics.context_budget_tokens === "number"
    && typeof metrics.context_usage_percent === "number"
    && typeof metrics.context_level === "string";
}

function DataContextMeter({ context }: { context: ContextMeterData | null }) {
  if (!context) return <div className="context-meter pending"><span>CSV / Excel context</span><small>실행 전 데이터 행을 확인하면 입력 크기를 계산합니다.</small></div>;
  const recordCount = context.matching_record_count ?? context.selected_record_count ?? 0;
  const percent = Math.min(context.context_usage_percent, 100);
  return <div className={`context-meter ${context.context_level}`} aria-label={`Trade Agent context usage: ${context.context_usage_percent}%`}>
    <div><span>CSV / Excel context</span><b>{formatTokenCount(context.estimated_context_tokens)} / {formatTokenCount(context.context_budget_tokens)} tokens</b></div>
    <div className="context-track"><span style={{ width: `${percent}%` }} /></div>
    <small>{recordCount.toLocaleString()} rows · {context.context_usage_percent}% · {context.context_safe ? context.context_level.toUpperCase() : "TOO LARGE — narrow the scope"}</small>
  </div>;
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
  const isAllSelected = values.includes(ALL_SCOPE_VALUE);

  function addInput() {
    const additions = splitList(input).filter((value) => !values.includes(value));
    if (additions.length) onChange(isAllSelected ? additions : [...values, ...additions]);
    setInput("");
  }

  return <label className="selection-field">
    <span>{label}</span>
    <div className="selection-actions" role="group" aria-label={`${label} 빠른 선택`}>
      <button type="button" className={isAllSelected ? "active" : ""} onClick={() => onChange([ALL_SCOPE_VALUE])}>전체</button>
      <button type="button" onClick={() => onChange([])}>선택 해제</button>
    </div>
    <div className="selection-control">
      {isAllSelected ? <span className="selection-chip">전체 데이터<button type="button" onClick={() => onChange([])} aria-label={`${label} 전체 선택 해제`}>×</button></span> : values.map((value) => <span className="selection-chip" key={value}>{value}<button type="button" onClick={() => onChange(values.filter((item) => item !== value))} aria-label={`${value} 제거`}>×</button></span>)}
      <input aria-label={`${label} 선택 또는 입력`} list={`${id}-options`} value={input} placeholder={placeholder} onChange={(event) => setInput(event.target.value)} onBlur={addInput} onKeyDown={(event) => { if (event.key === "Enter" || event.key === ",") { event.preventDefault(); addInput(); } }} />
    </div>
    <datalist id={`${id}-options`}>{options.filter((option) => !values.includes(option)).map((option) => <option value={option} key={option} />)}</datalist>
    <small>{isAllSelected ? "데이터에 있는 모든 항목을 분석합니다." : "목록에서 선택하거나 입력 후 Enter"}</small>
  </label>;
}

function ReportView({ run }: { run: RunDetail }) {
  const report = run.result!.report;
  const figures = resolveReportFigures(report, run.result!.visualization);
  return <article className="report-document"><div className="report-meta"><span>RUN {run.id.slice(0, 8).toUpperCase()}</span><span>{run.request.start_period} — {run.request.end_period}</span></div>{report.markdown.trim() ? <div className="markdown-content"><ReactMarkdown remarkPlugins={[remarkGfm]}>{report.markdown}</ReactMarkdown></div> : <StructuredReport report={report} />}{figures.length > 0 && <ReportFigures figures={figures} runId={run.id} />}</article>;
}

function resolveReportFigures(report: ReportDraft, visualization: VisualizationResult | null): ChartArtifact[] {
  const charts = visualization?.chart_artifacts ?? [];
  if (!report.visualization_ids?.length) return charts.slice(0, 4);
  const byId = new Map(charts.map((chart) => [chart.chart_id, chart]));
  return (report.visualization_ids ?? []).map((chartId) => byId.get(chartId)).filter((chart): chart is ChartArtifact => Boolean(chart));
}

function ReportFigures({ figures, runId }: { figures: ChartArtifact[]; runId?: string }) {
  return <section className="report-figures" aria-labelledby="report-figures-heading"><h2 id="report-figures-heading">Figures</h2><p className="report-figures-intro">아래 차트는 보고서의 핵심 특이점을 뒷받침하는 결정론적 통계 시각화입니다.</p><div className="report-figure-grid">{figures.map((figure, index) => <figure className="report-figure" key={figure.chart_id}><img src={chartImageSource(runId, figure)} alt={`Figure ${index + 1}. ${figure.title}`} /><figcaption><strong>Figure {index + 1}. {figure.title}</strong><span>{figure.caption || figure.description}</span><small className="source-note">{figure.source_note}</small>{figure.anomaly_ids.length > 0 && <small>{figure.anomaly_ids.map((anomalyId) => <em key={anomalyId}>{anomalyId}</em>)}</small>}</figcaption></figure>)}</div></section>;
}

function StructuredReport({ report }: { report: ReportDraft }) {
  return <><h2>{report.title}</h2><p className="executive-summary">{report.executive_summary}</p>{report.sections.map((section) => <section key={section.heading}><h3>{section.heading}</h3><p>{section.content}</p></section>)}<section><h3>결론</h3><p>{report.conclusion}</p></section>{report.limitations.length > 0 && <section className="limitations"><h3>해석의 한계</h3><ul>{report.limitations.map((item) => <li key={item}>{item}</li>)}</ul></section>}<footer className="references"><h3>References</h3>{report.references.length ? <ol>{report.references.map((reference) => <li key={reference}>{reference}</li>)}</ol> : <p>보고서에 포함된 근거를 검토하세요.</p>}</footer></>;
}

function StageInspector({ stage, output, run, onClose }: { stage: Stage; output: unknown; run: RunDetail | null; onClose: () => void }) {
  const visualization = stage === "visualization" && isRecord(output) && typeof output.html === "string" ? output : null;
  const charts = stage === "visualization" ? run?.result?.visualization?.chart_artifacts ?? [] : [];
  return <section className="stage-inspector" aria-label={`${stageMeta[stage].label} 전체 출력`}><div><span className="section-kicker">FULL STRUCTURED OUTPUT</span><h3>{stageMeta[stage].label}</h3></div><button type="button" className="close-inspector" onClick={onClose} aria-label="전체 출력 닫기">×</button>{charts.length > 0 && run && <VisualizationGallery runId={run.id} charts={charts} selectedIds={run.result?.report.visualization_ids ?? []} />}{visualization && <details className="interactive-viz"><summary>Interactive summary</summary><iframe className="visualization-frame" sandbox="allow-scripts" srcDoc={visualization.html as string} title="Trade anomaly visualization" /></details>}{output ? <OutputTree value={output} /> : <p>이 단계의 출력은 아직 준비되지 않았습니다. 완료된 단계 또는 저장된 실행을 선택하세요.</p>}</section>;
}

type GalleryFilter = "all" | "overview" | "anomaly" | "country" | "product" | "rca" | "price-volume" | "included";

function VisualizationGallery({ runId, charts, selectedIds }: { runId: string; charts: ChartArtifact[]; selectedIds: string[] }) {
  const [filter, setFilter] = useState<GalleryFilter>("all");
  const selected = new Set(selectedIds);
  const filters: Array<{ id: GalleryFilter; label: string }> = [
    { id: "all", label: "All" }, { id: "overview", label: "Overview" }, { id: "anomaly", label: "Anomaly" },
    { id: "country", label: "Country" }, { id: "product", label: "Product" }, { id: "rca", label: "RCA" },
    { id: "price-volume", label: "Price-volume" }, { id: "included", label: "In report" },
  ];
  const visible = charts.filter((chart) => chartMatchesFilter(chart, filter, selected));
  return <section className="viz-gallery" aria-labelledby="viz-gallery-heading">
    <div className="viz-gallery-heading"><div><span className="section-kicker">EXPLORATORY PACKAGE</span><h4 id="viz-gallery-heading">{charts.length} evidence views</h4></div><span>{selected.size} in report</span></div>
    <div className="viz-filters" role="group" aria-label="시각화 필터">{filters.map((item) => <button type="button" key={item.id} className={filter === item.id ? "active" : ""} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>)}</div>
    <div className="viz-grid">{visible.map((chart) => <details className="viz-card" key={chart.chart_id}>
      <summary><span className="viz-card-code">{chart.chart_id}</span><span><b>{chart.title}</b><small>{chart.effective_template_id.replaceAll("_", " ")}</small></span><em className={selected.has(chart.chart_id) ? "included" : ""}>{selected.has(chart.chart_id) ? "IN REPORT" : "EXPLORE"}</em></summary>
      {chart.renderer === "liner_viz" && chart.html
        ? <iframe className="viz-card-frame" sandbox="allow-scripts" srcDoc={chart.html} title={`${chart.chart_id}. ${chart.title}`} />
        : <img src={chartImageSource(runId, chart)} alt={`${chart.chart_id}. ${chart.title}`} loading="lazy" />}
      <div className="viz-card-copy"><p>{chart.key_observations?.[0] ?? chart.description}</p><small>{chart.source_note}</small>{chart.anomaly_ids.length > 0 && <div className="viz-tags">{chart.anomaly_ids.slice(0, 4).map((id) => <span key={id}>{id}</span>)}</div>}</div>
    </details>)}</div>
  </section>;
}

function chartMatchesFilter(chart: ChartArtifact, filter: GalleryFilter, selected: Set<string>): boolean {
  if (filter === "all") return true;
  if (filter === "included") return selected.has(chart.chart_id);
  if (filter === "overview" || filter === "anomaly") return chart.category === filter;
  if (filter === "country") return chart.effective_template_id.includes("partner") || chart.effective_template_id.includes("country");
  if (filter === "product") return chart.effective_template_id.includes("product") || chart.effective_template_id.includes("composition");
  if (filter === "rca") return chart.effective_template_id.includes("rca");
  return chart.effective_template_id.includes("unit_value") || chart.effective_template_id.includes("quantity");
}

function chartImageSource(runId: string | undefined, chart: ChartArtifact): string {
  if (chart.image_data_url) return chart.image_data_url;
  return runId ? getChartImageUrl(runId, chart.chart_id) : "";
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

function formatTokenCount(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export default App;
