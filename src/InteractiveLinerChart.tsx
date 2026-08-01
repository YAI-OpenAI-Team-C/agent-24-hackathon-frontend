import { useEffect, useRef, useState } from "react";

import type { Chart } from "./types";

interface InteractiveLinerChartProps {
  chart:Chart;
  onCountrySelect?:(country:string,source:HTMLIFrameElement)=>void;
}

export function InteractiveLinerChart({chart,onCountrySelect}:InteractiveLinerChartProps) {
  const [expanded,setExpanded]=useState(false);
  const [reloadKey,setReloadKey]=useState(0);
  const iframeRef=useRef<HTMLIFrameElement>(null);

  useEffect(()=>{
    if(!expanded)return;
    const close=(event:KeyboardEvent)=>{if(event.key==="Escape")setExpanded(false);};
    window.addEventListener("keydown",close);
    return()=>window.removeEventListener("keydown",close);
  },[expanded]);

  useEffect(()=>{
    if(!onCountrySelect)return;
    const receive=(event:MessageEvent)=>{
      const iframe=iframeRef.current;
      if(!iframe||event.source!==iframe.contentWindow)return;
      if(event.data?.type!=="agent24:country-select"||typeof event.data.country!=="string")return;
      onCountrySelect(event.data.country,iframe);
    };
    window.addEventListener("message",receive);
    return()=>window.removeEventListener("message",receive);
  },[onCountrySelect,reloadKey]);

  return <div className={`interactive-chart ${expanded?"expanded":""}`} role={expanded?"dialog":undefined} aria-modal={expanded||undefined}>
    <div className="chart-tools"><span>{chart.kind==="country"?"국가 막대·라벨·요약 카드를 선택해 상세 보기":"마우스를 올려 값 확인 · 범례 클릭으로 계열 토글"}</span><div><button type="button" onClick={()=>setReloadKey(key=>key+1)}>↻ 다시 보기</button><button type="button" onClick={()=>setExpanded(value=>!value)}>{expanded?"축소":"확대"}</button></div></div>
    <iframe ref={iframeRef} key={reloadKey} title={chart.title} sandbox="allow-scripts allow-popups" srcDoc={chart.html}/>
  </div>;
}
