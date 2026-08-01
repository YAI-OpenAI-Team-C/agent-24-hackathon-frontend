import { FormEvent, Fragment, useEffect, useMemo, useState } from "react";
import { API_BASE, createRun, estimateContext, getFilterOptions, getReport, pdfUrl, streamEvents } from "./api";
import type { AgentKey, AnalysisFrequency, Chart, ContextEstimate, FilterOptions, Metric, MonthMetric, OutputType, Report, ReportSentence, RunRequest, TimelineEvent } from "./types";

const AGENTS: { key: AgentKey; name: string; role: string }[] = [
  { key: "terra", name: "TERRA", role: "계획·판정" }, { key: "code", name: "CODE", role: "집계·조립" },
  { key: "luna", name: "LUNA", role: "초안·대질" }, { key: "sol", name: "SOL", role: "검증·해석" },
  { key: "liner", name: "LINER", role: "근거·시각화" },
];
const initial: RunRequest = { input: "2026년 6월 수출 동향 브리핑을 작성해줘. 반도체 중심으로.", mode: "fast", output_type: "report", countries:["__all__"], products:["__all__"], currency:"USD", analysis_frequency:"monthly" };

export default function App() {
  const [request, setRequest] = useState(initial); const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [report, setReport] = useState<Report | null>(null); const [runId, setRunId] = useState("");
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const [filterOptions,setFilterOptions]=useState<FilterOptions>({countries:[],products:[]});
  const [context,setContext]=useState<ContextEstimate|null>(null);
  const activeAgent = events.at(-1)?.agent; const lastEvent = events.at(-1);
  const completedStages = useMemo(() => new Set(events.map(event => event.stage.split(".")[0])), [events]);
  useEffect(()=>{getFilterOptions().then(options=>{setFilterOptions(options);setRequest(current=>({...current,products:current.products[0]==="__all__"&&options.products.some(p=>p.value==="854232")?["854232"]:current.products,start_period:current.start_period??shiftMonth(options.period_end,-5)??options.period_start,end_period:current.end_period??options.period_end}));}).catch(()=>undefined);},[]);
  useEffect(()=>{const timer=window.setTimeout(()=>estimateContext(request).then(setContext).catch(()=>setContext(null)),250);return()=>window.clearTimeout(timer);},[request.input,request.countries,request.products,request.start_period,request.end_period]);

  async function run(event: FormEvent) {
    event.preventDefault(); setLoading(true); setEvents([]); setReport(null); setError("");
    const rawWindow = window.open(rawStreamUrl(), "agent24-raw-stream", "popup,width=1440,height=900");
    try {
      const accepted = await createRun(request); setRunId(accepted.id);
      rawWindow?.postMessage({ type: "agent24-run", runId: accepted.id, apiBase: API_BASE }, window.location.origin);
      await streamEvents(accepted.id, item => setEvents(current => [...current.slice(-79), item]));
      setReport(await getReport(accepted.id));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "실행에 실패했습니다."); }
    finally { setLoading(false); }
  }

  return <main className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">24</span>AGENT:24</div><p>TRADE INTELLIGENCE / EVIDENCE CONSOLE</p><a className="raw-stream-link" href={rawStreamUrl(runId || undefined)} target="agent24-raw-stream">RAW API STREAM ↗</a><span className={`system-state ${loading ? "live" : ""}`}>{loading ? "LIVE RUN" : "SYSTEM READY"}</span></header>
    <section className="hero"><div><p className="eyebrow">MULTI-AGENT CUSTOMS BRIEFING</p><h1>수치에서 근거까지,<br/><em>검증되는 무역 보고서.</em></h1></div><p>관세청 원자료를 코드로 집계하고 Liner가 외부 근거와 시각화를 보강합니다. 보고서와 논문을 같은 데이터 계보에서 만듭니다.</p></section>
    <section className="workspace">
      <aside className="control-rail"><form onSubmit={run}>
        <Heading no="01" title="Research brief"/>
        <ScopeSelect label="국가·지역" values={request.countries} options={filterOptions.countries} onChange={countries=>setRequest({...request,countries})}/>
        <ScopeSelect label="품목" values={request.products} options={filterOptions.products} onChange={products=>{
          const selected=filterOptions.products.filter(option=>products.includes(option.value));
          const starts=selected.map(option=>option.period_start).filter(Boolean) as string[],ends=selected.map(option=>option.period_end).filter(Boolean) as string[];
          setRequest({...request,products,start_period:starts.length?starts.sort()[0]:request.start_period,end_period:ends.length?ends.sort().at(-1):request.end_period});
        }}/>
        <div className="two-up"><label>표시 단위<select value={request.currency} onChange={e=>setRequest({...request,currency:e.target.value as "USD"|"KRW"})}><option value="USD">USD</option><option value="KRW">KRW</option></select></label><label>목표 단어 수<select value={request.word_count==null?"any":"target"} onChange={e=>setRequest({...request,word_count:e.target.value==="any"?undefined:(request.word_count??1000)})}><option value="any">제한 없음</option><option value="target">직접 지정</option></select>{request.word_count!=null&&<input type="number" min="100" max="5000" value={request.word_count} onChange={e=>setRequest({...request,word_count:Number(e.target.value)})}/>}</label></div>
        <PeriodControls request={request} onChange={setRequest}/>
        <ContextBar context={context}/>
        <label>요청<textarea value={request.input} onChange={e=>setRequest({...request,input:e.target.value})}/></label>
        <label>출력 유형<select value={request.output_type} onChange={e=>setRequest({...request,output_type:e.target.value as OutputType})}><option value="report">정책 보고서 · 국문 브리프</option><option value="paper">학술 논문 · 영문 APA</option></select></label>
        <label>실행 파이프라인<select value={request.mode} onChange={e=>setRequest({...request,mode:e.target.value as RunRequest["mode"]})}><option value="fast">fast · 2분 시연 병렬</option><option value="live">live · 축소 검증</option><option value="full">full · 정식 검증</option></select></label>
        <button className="run-button" disabled={loading||context?.safe===false}>{loading ? "AGENTS WORKING…" : "START BRIEFING"}<span>↗</span></button>
      </form><div className="run-meta"><Heading no="02" title="Run access"/><p>{runId ? `RUN ${runId}` : "실행 후 결과와 PDF 링크가 열립니다."}</p>{runId && <><a href={`${API_BASE}/runs/${runId}/report`} target="_blank">JSON RESULT ↗</a><a href={pdfUrl(runId)} target="_blank">{request.output_type === "paper" ? "PAPER" : "REPORT"} PDF ↗</a></>}</div></aside>
      <section className="analysis-panel"><div className="panel-heading"><div><span>LIVE EXECUTION</span><h2>Agent collaboration</h2></div><b>{events.length} EVENTS</b></div>
        <div className="agent-grid">{AGENTS.map(agent=><div key={agent.key} className={`agent ${activeAgent===agent.key?"active":""}`}><strong>{agent.name}</strong><small>{agent.role}</small></div>)}</div>
        <div className="signal">{lastEvent ? `${lastEvent.agent.toUpperCase()} · ${lastEvent.name}` : "협업 신호 대기 중"}</div>
        <div className="timeline">{events.slice(-12).reverse().map(event=><div className="event" key={event.id}><span>{event.id}</span><b>{event.stage}</b><p>{event.name.replace("pipeline.","")}</p></div>)}</div>
        {!events.length && <div className="empty-dark">TERRA가 계획을 세우면 실시간 협업 과정이 여기에 나타납니다.</div>}
        <p className="process-note">공개 이벤트와 도구 호출 상태만 표시하며 비공개 내부 추론은 노출하지 않습니다.</p>
      </section>
      <section className={`report-panel ${report?.output_type === "paper" ? "paper-mode" : "report-mode"}`} id="report"><div className="panel-heading"><div><span>FINAL OUTPUT</span><h2>{(report?.output_type ?? request.output_type) === "paper" ? "Research paper" : "Trade briefing"}</h2></div>{report&&<a className="print-button" href={pdfUrl(runId)} target="_blank">{report.output_type === "paper" ? "PAPER PDF" : "REPORT PDF"} ↗</a>}</div>
        {report ? <ReportView report={report}/> : <div className="report-empty"><div className={`empty-orbit ${loading?"spinning":""}`}><span/></div><h3>{loading?"근거를 조립하고 있습니다":"아직 결과가 없습니다"}</h3><p>{loading?"왼쪽 협업 신호에서 현재 담당 에이전트를 확인하세요.":"요청과 파이프라인을 고른 뒤 브리핑을 시작하세요."}</p></div>}
        {error&&<div className="error-box">{error}</div>}
      </section>
    </section>
  </main>;
}

function Heading({no,title}:{no:string;title:string}) { return <div className="form-heading"><span>{no}</span><h2>{title}</h2></div> }
function rawStreamUrl(runId?: string): string { const url=new URL("/console.html",window.location.origin);url.searchParams.set("api",API_BASE);if(runId)url.searchParams.set("run",runId);return url.toString(); }
function shiftMonth(period:string|undefined,delta:number):string|undefined { if(!period)return undefined;const [year,month]=period.split("-").map(Number);const date=new Date(Date.UTC(year,month-1+delta,1));return `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,"0")}`; }
function ScopeSelect({label,values,options,onChange}:{label:string;values:string[];options:Array<{value:string;label:string}>;onChange:(values:string[])=>void}) {
  const selectedLabels=values[0]==="__all__"?["전체 데이터"]:values.map(value=>options.find(option=>option.value===value)?.label??value);
  const toggle=(value:string)=>{const next=values[0]==="__all__"?[]:[...values];onChange(next.includes(value)?(next.filter(item=>item!==value).length?next.filter(item=>item!==value):["__all__"]):[...next,value]);};
  return <div className="scope-select"><span>{label}</span><details><summary>{selectedLabels.length===1?selectedLabels[0]:`${selectedLabels.length}개 선택`}</summary><div className="scope-menu"><button type="button" className={values[0]==="__all__"?"selected":""} onClick={()=>onChange(["__all__"])}>전체 데이터</button>{options.map(option=><label key={option.value}><input type="checkbox" checked={values.includes(option.value)} onChange={()=>toggle(option.value)}/><span>{option.label}</span></label>)}</div></details><div className="scope-chips">{selectedLabels.slice(0,3).map(label=><b key={label}>{label}</b>)}{selectedLabels.length>3&&<b>+{selectedLabels.length-3}</b>}</div><small>목록에서 국가·지역 또는 품목을 복수 선택할 수 있습니다.</small></div>;
}
function PeriodControls({request,onChange}:{request:RunRequest;onChange:(request:RunRequest)=>void}) {
  const notes:Record<AnalysisFrequency,string>={monthly:"월별 흐름과 전월·전년 동월 비교",quarterly:"3개월 단위 집계와 전분기 비교",half_yearly:"6개월 단위 집계와 전반기 비교",yearly:"연간 집계와 전년 비교"};
  return <section className="period-controls"><label>분석 주기<select value={request.analysis_frequency} onChange={e=>onChange({...request,analysis_frequency:e.target.value as AnalysisFrequency})}><option value="monthly">월간</option><option value="quarterly">분기</option><option value="half_yearly">반기</option><option value="yearly">연간</option></select><small>{notes[request.analysis_frequency]}</small></label><div className="two-up"><label>시작 년월<input type="month" value={request.start_period??""} max={request.end_period} onChange={e=>onChange({...request,start_period:e.target.value})}/></label><label>마감 년월<input type="month" value={request.end_period??""} min={request.start_period} onChange={e=>onChange({...request,end_period:e.target.value})}/></label></div></section>;
}
function ContextBar({context}:{context:ContextEstimate|null}) {
  const percent=context?.usage_percent??0,visual=Math.min(100,percent);
  const status=!context?"":context.matching_records===0?"NO DATA — 품목의 제공 기간을 확인하세요":context.safe?"READY":"TOO LARGE — 범위를 좁혀주세요";
  return <section className={`context-meter ${context?.matching_records===0?"critical":context?.level??"low"}`}><div><span>CONTEXT WINDOW</span><b>{context?`${(context.estimated_tokens/1000).toFixed(1)}K / 50K tokens`:"calculating…"}</b></div><i><b style={{width:`${visual}%`}}/></i>{context&&<small>{context.matching_records.toLocaleString()} rows · {percent}% · {status}</small>}</section>;
}
function InteractiveLinerChart({chart}:{chart:Chart}) {
  const [expanded,setExpanded]=useState(false),[reloadKey,setReloadKey]=useState(0);
  useEffect(()=>{if(!expanded)return;const close=(event:KeyboardEvent)=>{if(event.key==="Escape")setExpanded(false)};window.addEventListener("keydown",close);return()=>window.removeEventListener("keydown",close)},[expanded]);
  return <div className={`interactive-chart ${expanded?"expanded":""}`} role={expanded?"dialog":undefined} aria-modal={expanded||undefined}>
    <div className="chart-tools"><span>마우스를 올려 값 확인 · 범례 클릭으로 계열 토글</span><div><button type="button" onClick={()=>setReloadKey(key=>key+1)}>↻ 다시 보기</button><button type="button" onClick={()=>setExpanded(value=>!value)}>{expanded?"축소":"확대"}</button></div></div>
    <iframe key={reloadKey} title={chart.title} sandbox="allow-scripts allow-popups" srcDoc={chart.html}/>
  </div>;
}
function ReportView({report}:{report:Report}) {
  return report.output_type === "paper" ? <AcademicPaperView report={report}/> : <PolicyReportView report={report}/>;
}
function groupPaperSentences(sentences:ReportSentence[]):ReportSentence[][] {
  const groups:ReportSentence[][]=[]; let current:ReportSentence[]=[];
  const topicShift=/^(However|Nevertheless|By contrast|In contrast|Conversely|For firms|For policymakers|For policy|Finally|First,|Second,|Third,|The results|These results|This limitation|A further limitation|Future research)\b/i;
  sentences.forEach(sentence=>{
    if(current.length>=2&&topicShift.test(sentence.text.trim())) { groups.push(current); current=[]; }
    current.push(sentence);
    if(current.length>=4) { groups.push(current); current=[]; }
  });
  if(current.length) groups.push(current);
  return groups;
}
function AcademicPaperView({report}:{report:Report}) {
  const sections=report.sections??[], abstract=sections.find(s=>s.heading.toLowerCase().startsWith("abstract"));
  const body=sections.filter(s=>s!==abstract), ledger=report.evidence_audit?.ledger??[], ts=report.timeseries??{};
  return <article className="academic-paper">
    <header className="paper-title"><span>ORIGINAL RESEARCH · CUSTOMS STATISTICS</span><h1>{report.headline}</h1><p>Korea Customs Service bilateral trade statistics · Sample period {report.data_provenance?.period??report.period}</p></header>
    {abstract&&<section className="abstract"><h2>Abstract</h2><p>{abstract.sentences.map(s=>s.text).join(" ")}</p><small>Keywords: Korea trade; HS classification; export performance; evidence verification</small></section>}
    {body.map(section=><section className="paper-section" key={section.heading}><h2>{section.heading}</h2>{groupPaperSentences(section.sentences).map((paragraph,index)=><p key={index}>{paragraph.map((sentence,sentenceIndex)=><Fragment key={sentenceIndex}>{sentenceIndex>0?" ":null}{sentence.text}{sentence.evidence?.length?<sup title={sentence.evidence.map(e=>e.title).join("; ")}> [{sentence.evidence.map((e,i)=>e.year?`${e.year}${i<sentence.evidence!.length-1?"; ":""}`:"n.d.").join("")}]</sup>:null}</Fragment>)}</p>)}{section.heading.toLowerCase().startsWith("results")&&<PaperFigures report={report}/>}</section>)}
    <section className="paper-references"><h2>References</h2>{ledger.length?ledger.map((row:any,index:number)=><p key={index}>{row.title}. ({row.year??"n.d."}). {row.url&&<a href={row.url} target="_blank" rel="noreferrer">{row.url}</a>}</p>):<p>No external references were accepted by the verification pipeline.</p>}</section>
    <footer className="paper-audit">Data records {report.audit?.input_records??0} · Evidence coverage {report.evidence_audit?.coverage_pct??0}% · Generated in {report.audit?.elapsed_sec??"-"} seconds</footer>
  </article>;
}
function PaperFigures({report}:{report:Report}) { const ts=report.timeseries??{}; return <div className="paper-figures"><figure><Trend rows={ts.monthly_series??[]} currency={report.currency}/><figcaption>Figure 1. Monthly trade value. Source: Korea Customs Service; authors' calculations.</figcaption></figure><figure><Composition rows={ts.items??[]}/><figcaption>Figure 2. Product composition. Source: Korea Customs Service; authors' calculations.</figcaption></figure>{report.charts?.map((chart,index)=><figure key={index}>{chart.ok&&chart.html?<InteractiveLinerChart chart={chart}/>:<Composition rows={chart.fallback_rows??[]}/>}<figcaption>Figure {index+3}. {chart.title}. {chart.ok?"Interactive Liner Visualization — hover, click legends, and expand to explore.":"Deterministic data fallback."}</figcaption></figure>)}</div> }
function PolicyReportView({report}:{report:Report}) {
  const ts=report.timeseries??{}, latest=ts.monthly_series?.at(-1), top=ts.items?.[0], evidence=report.evidence_audit??{}, audit=report.audit??{};
  return <article className="report-document"><div className="report-meta"><span>CONFIDENCE {report.confidence_level}</span><span>{report.period}</span></div><h2>{report.headline}</h2>
    <div className="kpis"><Kpi value={money(latest?.value_usd,report.currency)} label="당월 수출액" sub={`전월비 ${pct(latest?.mom_pct)}`}/><Kpi value={pct(latest?.yoy_pct)} label="전년동월비"/><Kpi value={top?.share==null?"n/a":`${(top.share*100).toFixed(1)}%`} label="1위 품목 비중" sub={top?.label}/><Kpi value={`${evidence.coverage_pct??0}%`} label="근거 커버리지" sub={`고유 출처 ${evidence.unique_sources??0}개`}/></div>
    <div className="viz-grid"><div className="viz-card"><h3>월별 수출 추이</h3><Trend rows={ts.monthly_series??[]} currency={report.currency}/></div><div className="viz-card"><h3>무엇이 움직였나</h3><Composition rows={ts.items??[]}/></div></div>
    <p className="provenance"><b>데이터 계보</b> · {report.data_provenance?.source??"관세청 무역통계"} · {report.data_provenance?.records??audit.input_records??0}건 · {report.data_provenance?.transform??"원자료 코드 집계"}</p>
    {report.sections?.map(section=><section key={section.heading}><h3>{section.heading}</h3>{section.sentences.map((sentence,index)=><div className="sentence" key={index}><span className={`badge ${sentence.status}`}>{sentence.status}</span><div><p>{sentence.text}</p>{sentence.evidence?.map((item,i)=><a className="evidence" key={i} href={item.url} target="_blank" rel="noreferrer">{item.title}{item.year?` (${item.year})`:""}<small>{item.quote}</small></a>)}</div></div>)}</section>)}
    <EvidenceChain report={report}/>{report.charts?.length>0&&<section><h3>Liner visualizations</h3><div className="charts">{report.charts.map((chart,index)=><div className="chart" key={index}><h4>{chart.title}<span>{chart.ok?"INTERACTIVE LINER VIZ":"FALLBACK"}</span></h4>{chart.ok&&chart.html?<InteractiveLinerChart chart={chart}/>:<Composition rows={chart.fallback_rows??[]}/>}</div>)}</div></section>}
    {((report.anomaly_warnings?.length??0)+(report.revision_watch?.length??0)>0)&&<section className="warnings"><h3>사람이 확인할 지점</h3>{[...(report.anomaly_warnings??[]),...(report.revision_watch??[])].slice(0,6).map((item,i)=><pre key={i}>{JSON.stringify(item,null,2)}</pre>)}</section>}
  </article>
}
function Kpi({value,label,sub}:{value:string;label:string;sub?:string}) { return <div className="kpi"><strong>{value}</strong><span>{label}</span><small>{sub}</small></div> }
function Trend({rows,currency="USD"}:{rows:MonthMetric[];currency?:"USD"|"KRW"}) { const values=rows.slice(-13), max=Math.max(...values.map(x=>x.value_usd),1); return <div className="bars">{values.map(row=><div key={row.period} title={`${row.period}: ${money(row.value_usd,currency)}`} style={{height:`${Math.max(4,row.value_usd/max*100)}%`}}><span>{row.period.slice(2)}</span></div>)}</div> }
function Composition({rows}:{rows:Metric[]}) { return <div className="composition">{rows.slice(0,6).map(row=><div key={row.label}><span>{row.label}</span><i><b style={{width:`${Math.max(2,(row.share??0)*100)}%`}}/></i><em>{row.share==null?money(row.value_usd):`${(row.share*100).toFixed(1)}%`}</em></div>)}</div> }
function EvidenceChain({report}:{report:Report}) { const e=report.evidence_audit??{},a=report.audit??{},ledger=e.ledger??[]; return <section><h3>Evidence chain</h3><div className="proof-flow"><Kpi value={`${a.input_records??0}`} label="records"/><Kpi value={`${a.specialists?.macro_signals??0}`} label="signals"/><Kpi value={`${e.evidence_refs??0}`} label="citations"/><Kpi value={`${(a.badges?.verified??0)+(a.badges?.adjusted??0)}`} label="survived"/></div><details><summary>출처 원장 펼치기 · {ledger.length}개</summary>{ledger.map((row:any,i:number)=><a className="source" href={row.url} target="_blank" rel="noreferrer" key={i}>{row.title}<small>{(row.used_for??[]).join(" · ")}</small></a>)}</details></section> }
const money=(n?:number,currency:"USD"|"KRW"="USD")=>n==null?"n/a":currency==="KRW"?`₩${(n*1350/1e12).toFixed(1)}T`:`$${(n/1e9).toFixed(1)}B`; const pct=(n?:number)=>n==null?"n/a":`${n>0?"+":""}${n.toFixed(1)}%`;
