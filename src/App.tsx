import { FormEvent, useMemo, useState } from "react";
import { API_BASE, createRun, getReport, pdfUrl, streamEvents } from "./api";
import type { AgentKey, Metric, MonthMetric, OutputType, Report, RunRequest, TimelineEvent } from "./types";

const AGENTS: { key: AgentKey; name: string; role: string }[] = [
  { key: "terra", name: "TERRA", role: "계획·판정" }, { key: "code", name: "CODE", role: "집계·조립" },
  { key: "luna", name: "LUNA", role: "초안·대질" }, { key: "sol", name: "SOL", role: "검증·해석" },
  { key: "liner", name: "LINER", role: "근거·시각화" },
];
const initial: RunRequest = { input: "2026년 6월 수출 동향 브리핑을 작성해줘. 반도체 중심으로.", mode: "fast", output_type: "report" };

export default function App() {
  const [request, setRequest] = useState(initial); const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [report, setReport] = useState<Report | null>(null); const [runId, setRunId] = useState("");
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const activeAgent = events.at(-1)?.agent; const lastEvent = events.at(-1);
  const completedStages = useMemo(() => new Set(events.map(event => event.stage.split(".")[0])), [events]);

  async function run(event: FormEvent) {
    event.preventDefault(); setLoading(true); setEvents([]); setReport(null); setError("");
    try {
      const accepted = await createRun(request); setRunId(accepted.id);
      await streamEvents(accepted.id, item => setEvents(current => [...current.slice(-79), item]));
      setReport(await getReport(accepted.id));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "실행에 실패했습니다."); }
    finally { setLoading(false); }
  }

  return <main className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">24</span>AGENT:24</div><p>TRADE INTELLIGENCE / EVIDENCE CONSOLE</p><span className={`system-state ${loading ? "live" : ""}`}>{loading ? "LIVE RUN" : "SYSTEM READY"}</span></header>
    <section className="hero"><div><p className="eyebrow">MULTI-AGENT CUSTOMS BRIEFING</p><h1>수치에서 근거까지,<br/><em>검증되는 무역 보고서.</em></h1></div><p>관세청 원자료를 코드로 집계하고 Liner가 외부 근거와 시각화를 보강합니다. 보고서와 논문을 같은 데이터 계보에서 만듭니다.</p></section>
    <section className="workspace">
      <aside className="control-rail"><form onSubmit={run}>
        <Heading no="01" title="Research brief"/><label>요청<textarea value={request.input} onChange={e=>setRequest({...request,input:e.target.value})}/></label>
        <label>출력 유형<select value={request.output_type} onChange={e=>setRequest({...request,output_type:e.target.value as OutputType})}><option value="report">정책 보고서 · 국문 브리프</option><option value="paper">학술 논문 · 영문 APA</option></select></label>
        <label>실행 파이프라인<select value={request.mode} onChange={e=>setRequest({...request,mode:e.target.value as RunRequest["mode"]})}><option value="fast">fast · 2분 시연 병렬</option><option value="live">live · 축소 검증</option><option value="full">full · 정식 검증</option></select></label>
        <button className="run-button" disabled={loading}>{loading ? "AGENTS WORKING…" : "START BRIEFING"}<span>↗</span></button>
      </form><div className="run-meta"><Heading no="02" title="Run access"/><p>{runId ? `RUN ${runId}` : "실행 후 결과와 PDF 링크가 열립니다."}</p>{runId && <><a href={`${API_BASE}/runs/${runId}/report`} target="_blank">JSON RESULT ↗</a><a href={pdfUrl(runId)} target="_blank">{request.output_type === "paper" ? "PAPER" : "REPORT"} PDF ↗</a></>}</div></aside>
      <section className="analysis-panel"><div className="panel-heading"><div><span>LIVE EXECUTION</span><h2>Agent collaboration</h2></div><b>{events.length} EVENTS</b></div>
        <div className="agent-grid">{AGENTS.map(agent=><div key={agent.key} className={`agent ${activeAgent===agent.key?"active":""}`}><strong>{agent.name}</strong><small>{agent.role}</small></div>)}</div>
        <div className="signal">{lastEvent ? `${lastEvent.agent.toUpperCase()} · ${lastEvent.name}` : "협업 신호 대기 중"}</div>
        <div className="timeline">{events.slice(-12).reverse().map(event=><div className="event" key={event.id}><span>{event.id}</span><b>{event.stage}</b><p>{event.name.replace("pipeline.","")}</p></div>)}</div>
        {!events.length && <div className="empty-dark">TERRA가 계획을 세우면 실시간 협업 과정이 여기에 나타납니다.</div>}
        <p className="process-note">공개 이벤트와 도구 호출 상태만 표시하며 비공개 내부 추론은 노출하지 않습니다.</p>
      </section>
      <section className="report-panel" id="report"><div className="panel-heading"><div><span>FINAL OUTPUT</span><h2>{request.output_type === "paper" ? "Research paper" : "Trade briefing"}</h2></div>{report&&<a className="print-button" href={pdfUrl(runId)} target="_blank">PDF ↗</a>}</div>
        {report ? <ReportView report={report}/> : <div className="report-empty"><div className={`empty-orbit ${loading?"spinning":""}`}><span/></div><h3>{loading?"근거를 조립하고 있습니다":"아직 결과가 없습니다"}</h3><p>{loading?"왼쪽 협업 신호에서 현재 담당 에이전트를 확인하세요.":"요청과 파이프라인을 고른 뒤 브리핑을 시작하세요."}</p></div>}
        {error&&<div className="error-box">{error}</div>}
      </section>
    </section>
  </main>;
}

function Heading({no,title}:{no:string;title:string}) { return <div className="form-heading"><span>{no}</span><h2>{title}</h2></div> }
function ReportView({report}:{report:Report}) {
  const ts=report.timeseries??{}, latest=ts.monthly_series?.at(-1), top=ts.items?.[0], evidence=report.evidence_audit??{}, audit=report.audit??{};
  return <article className="report-document"><div className="report-meta"><span>CONFIDENCE {report.confidence_level}</span><span>{report.period}</span></div><h2>{report.headline}</h2>
    <div className="kpis"><Kpi value={money(latest?.value_usd)} label="당월 수출액" sub={`전월비 ${pct(latest?.mom_pct)}`}/><Kpi value={pct(latest?.yoy_pct)} label="전년동월비"/><Kpi value={top?.share==null?"n/a":`${(top.share*100).toFixed(1)}%`} label="1위 품목 비중" sub={top?.label}/><Kpi value={`${evidence.coverage_pct??0}%`} label="근거 커버리지" sub={`고유 출처 ${evidence.unique_sources??0}개`}/></div>
    <div className="viz-grid"><div className="viz-card"><h3>월별 수출 추이</h3><Trend rows={ts.monthly_series??[]}/></div><div className="viz-card"><h3>무엇이 움직였나</h3><Composition rows={ts.items??[]}/></div></div>
    <p className="provenance"><b>데이터 계보</b> · {report.data_provenance?.source??"관세청 무역통계"} · {report.data_provenance?.records??audit.input_records??0}건 · {report.data_provenance?.transform??"원자료 코드 집계"}</p>
    {report.sections?.map(section=><section key={section.heading}><h3>{section.heading}</h3>{section.sentences.map((sentence,index)=><div className="sentence" key={index}><span className={`badge ${sentence.status}`}>{sentence.status}</span><div><p>{sentence.text}</p>{sentence.evidence?.map((item,i)=><a className="evidence" key={i} href={item.url} target="_blank" rel="noreferrer">{item.title}{item.year?` (${item.year})`:""}<small>{item.quote}</small></a>)}</div></div>)}</section>)}
    <EvidenceChain report={report}/>{report.charts?.length>0&&<section><h3>Liner visualizations</h3><div className="charts">{report.charts.map((chart,index)=><div className="chart" key={index}><h4>{chart.title}<span>{chart.ok?"LINER VIZ":"FALLBACK"}</span></h4>{chart.ok&&chart.html?<iframe title={chart.title} sandbox="allow-scripts" srcDoc={chart.html}/>:<Composition rows={chart.fallback_rows??[]}/>}</div>)}</div></section>}
    {((report.anomaly_warnings?.length??0)+(report.revision_watch?.length??0)>0)&&<section className="warnings"><h3>사람이 확인할 지점</h3>{[...(report.anomaly_warnings??[]),...(report.revision_watch??[])].slice(0,6).map((item,i)=><pre key={i}>{JSON.stringify(item,null,2)}</pre>)}</section>}
  </article>
}
function Kpi({value,label,sub}:{value:string;label:string;sub?:string}) { return <div className="kpi"><strong>{value}</strong><span>{label}</span><small>{sub}</small></div> }
function Trend({rows}:{rows:MonthMetric[]}) { const values=rows.slice(-13), max=Math.max(...values.map(x=>x.value_usd),1); return <div className="bars">{values.map(row=><div key={row.period} title={`${row.period}: ${money(row.value_usd)}`} style={{height:`${Math.max(4,row.value_usd/max*100)}%`}}><span>{row.period.slice(2)}</span></div>)}</div> }
function Composition({rows}:{rows:Metric[]}) { return <div className="composition">{rows.slice(0,6).map(row=><div key={row.label}><span>{row.label}</span><i><b style={{width:`${Math.max(2,(row.share??0)*100)}%`}}/></i><em>{row.share==null?money(row.value_usd):`${(row.share*100).toFixed(1)}%`}</em></div>)}</div> }
function EvidenceChain({report}:{report:Report}) { const e=report.evidence_audit??{},a=report.audit??{},ledger=e.ledger??[]; return <section><h3>Evidence chain</h3><div className="proof-flow"><Kpi value={`${a.input_records??0}`} label="records"/><Kpi value={`${a.specialists?.macro_signals??0}`} label="signals"/><Kpi value={`${e.evidence_refs??0}`} label="citations"/><Kpi value={`${(a.badges?.verified??0)+(a.badges?.adjusted??0)}`} label="survived"/></div><details><summary>출처 원장 펼치기 · {ledger.length}개</summary>{ledger.map((row:any,i:number)=><a className="source" href={row.url} target="_blank" rel="noreferrer" key={i}>{row.title}<small>{(row.used_for??[]).join(" · ")}</small></a>)}</details></section> }
const money=(n?:number)=>n==null?"n/a":`$${(n/1e9).toFixed(1)}B`; const pct=(n?:number)=>n==null?"n/a":`${n>0?"+":""}${n.toFixed(1)}%`;
