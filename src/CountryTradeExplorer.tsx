import { useEffect, useRef, useState } from "react";
import type {
  CountryDrilldown,
  CountryProduct,
  CountryTradeMonth,
} from "./types";

type Currency = "USD" | "KRW";
type TradeDirection = "export"|"import";

interface CountryTradeDrawerProps {
  detail?:CountryDrilldown;
  currency?:Currency;
  onClose:()=>void;
  returnFocus?:HTMLElement|null;
}

export function CountryTradeDrawer({
  detail,
  currency="USD",
  onClose,
  returnFocus,
}:CountryTradeDrawerProps) {
  const [tradeDirection,setTradeDirection]=useState<TradeDirection>("export");
  const closeRef=useRef<HTMLButtonElement>(null);
  const drawerRef=useRef<HTMLElement>(null);

  useEffect(()=>{
    if(!detail)return;
    setTradeDirection("export");
    closeRef.current?.focus();
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    const onKeyDown=(event:KeyboardEvent)=>{
      if(event.key==="Escape")onClose();
      if(event.key!=="Tab")return;
      const focusable=[...(drawerRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])")??[])];
      const first=focusable[0],last=focusable.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    };
    window.addEventListener("keydown",onKeyDown);
    return()=>{window.removeEventListener("keydown",onKeyDown);document.body.style.overflow=previousOverflow;};
  },[detail,onClose]);

  function close() {
    onClose();
    window.setTimeout(()=>returnFocus?.focus(),0);
  }

  if(!detail)return null;

  return <div className="country-drawer-layer" onMouseDown={event=>{if(event.target===event.currentTarget)close();}}>
      <aside ref={drawerRef} className="country-drawer" role="dialog" aria-modal="true" aria-label={`${detail.label} 교역 상세`}>
        <header>
          <div><span>COUNTRY TRADE FILE · {detail.period}</span><h3>{detail.label}</h3></div>
          <button ref={closeRef} type="button" aria-label="상세 닫기" onClick={close}>닫기 ×</button>
        </header>
        <div className="country-drawer-kpis">
          <DrawerKpi label="수출" value={formatMoney(detail.exports_usd,currency)} change={formatPct(detail.export_mom_pct)}/>
          <DrawerKpi label="수입" value={formatMoney(detail.imports_usd,currency)} change={formatPct(detail.import_mom_pct)}/>
          <DrawerKpi label="무역수지" value={formatSignedMoney(detail.balance_usd,currency)} sub={detail.balance_usd>=0?"흑자":"적자"}/>
          <DrawerKpi label="전년동월" value={formatPct(tradeDirection==="export"?detail.export_yoy_pct:detail.import_yoy_pct)} sub={tradeDirection==="export"?"수출 기준":"수입 기준"}/>
        </div>
        <section className="country-trend-panel">
          <div className="drawer-section-heading"><div><span>01</span><h4>월별 수출입 흐름</h4></div><div className="trend-legend"><i/>수출 <i/>수입</div></div>
          <CountryMonthlyTrend rows={detail.monthly} currency={currency}/>
        </section>
        <section className="country-products-panel">
          <div className="drawer-section-heading"><div><span>02</span><h4>상위 품목</h4></div><div className="direction-toggle" aria-label="품목 방향">
            <button type="button" aria-pressed={tradeDirection==="export"} onClick={()=>setTradeDirection("export")}>수출</button>
            <button type="button" aria-pressed={tradeDirection==="import"} onClick={()=>setTradeDirection("import")}>수입</button>
          </div></div>
          <ProductRows rows={tradeDirection==="export"?detail.top_exports:detail.top_imports} currency={currency}/>
        </section>
      </aside>
    </div>;
}

function DrawerKpi({label,value,change,sub}:{label:string;value:string;change?:string;sub?:string}) {
  return <div><span>{label}</span><strong>{value}</strong><small>{change?`전월 대비 ${change}`:sub}</small></div>;
}

function ProductRows({rows,currency}:{rows:CountryProduct[];currency:Currency}) {
  if(!rows.length)return <p className="country-empty">이 방향의 품목 데이터가 없습니다.</p>;
  return <div className="country-product-rows">{rows.map(row=><div key={row.key}>
    <span>{row.label}<small>{row.key}</small></span>
    <i><b style={{width:`${Math.max(2,row.share*100)}%`}}/></i>
    <em>{formatMoney(row.value_usd,currency)}<small>{(row.share*100).toFixed(1)}%</small></em>
  </div>)}</div>;
}

function CountryMonthlyTrend({rows,currency}:{rows:CountryTradeMonth[];currency:Currency}) {
  const values=rows.slice(-13);
  if(!values.length)return <p className="country-empty">시계열 데이터가 없습니다.</p>;
  const width=620,height=190,padX=32,padTop=18,padBottom=35;
  const max=Math.max(...values.flatMap(row=>[row.exports_usd,row.imports_usd]),1);
  const x=(index:number)=>values.length===1?width/2:padX+index*(width-padX*2)/(values.length-1);
  const y=(value:number)=>padTop+(1-value/max)*(height-padTop-padBottom);
  const points=(key:"exports_usd"|"imports_usd")=>values.map((row,index)=>`${x(index)},${y(row[key])}`).join(" ");
  return <div className="country-trend-chart">
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="월별 수출입 금액 추이">
      {[0,.5,1].map(level=><line key={level} x1={padX} x2={width-padX} y1={y(max*level)} y2={y(max*level)} className="trend-grid"/>) }
      <polyline points={points("exports_usd")} className="trend-export"/>
      <polyline points={points("imports_usd")} className="trend-import"/>
      {values.map((row,index)=><g key={row.period}>
        <circle cx={x(index)} cy={y(row.exports_usd)} r="3.5" className="trend-export-point"><title>{`${row.period} 수출 ${formatMoney(row.exports_usd,currency)}`}</title></circle>
        <circle cx={x(index)} cy={y(row.imports_usd)} r="3.5" className="trend-import-point"><title>{`${row.period} 수입 ${formatMoney(row.imports_usd,currency)}`}</title></circle>
        {(values.length<=7||index%2===0||index===values.length-1)&&<text x={x(index)} y={height-10} textAnchor="middle">{row.period.slice(2)}</text>}
      </g>)}
    </svg>
    <div className="trend-latest"><span>최근 수출 <b>{formatMoney(values.at(-1)?.exports_usd,currency)}</b></span><span>최근 수입 <b>{formatMoney(values.at(-1)?.imports_usd,currency)}</b></span></div>
  </div>;
}

function formatMoney(value:number|undefined,currency:Currency):string {
  if(value==null)return "n/a";
  return currency==="KRW"?`₩${(value*1350/1e12).toFixed(1)}T`:`$${(value/1e9).toFixed(1)}B`;
}

function formatSignedMoney(value:number,currency:Currency):string {
  return `${value>=0?"+":"−"}${formatMoney(Math.abs(value),currency)}`;
}

function formatPct(value:number|undefined):string {
  return value==null?"n/a":`${value>0?"+":""}${value.toFixed(1)}%`;
}
