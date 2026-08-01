export type Mode = "fast" | "live" | "full";
export type OutputType = "report" | "paper";
export type AnalysisFrequency = "monthly" | "quarterly" | "half_yearly" | "yearly";
export type AgentKey = "terra" | "code" | "luna" | "sol" | "liner";

export interface RunRequest {
  input: string; mode: Mode; output_type: OutputType;
  countries: string[]; products: string[]; currency: "USD" | "KRW";
  word_count?: number; analysis_frequency: AnalysisFrequency;
  start_period?: string; end_period?: string;
}
export interface FilterOption { value:string; label:string; period_start?:string; period_end?:string }
export interface FilterOptions { countries:FilterOption[]; products:FilterOption[]; period_start?:string; period_end?:string }
export interface ContextEstimate { matching_records:number; estimated_tokens:number; token_limit:number; usage_percent:number; level:"low"|"medium"|"high"|"critical"; safe:boolean }
export interface RunAccepted { id: string; status: string; events_url: string }
export interface Evidence { title: string; url?: string; quote?: string; year?: number; citations?: number }
export interface ReportSentence { text: string; status: string; evidence?: Evidence[] }
export interface ReportSection { heading: string; sentences: ReportSentence[] }
export interface Chart { title: string; ok: boolean; html?: string; fallback_rows?: Metric[] }
export interface Metric { label: string; value_usd: number; mom_pct?: number; yoy_pct?: number; share?: number }
export interface MonthMetric { period: string; value_usd: number; mom_pct?: number; yoy_pct?: number }
export interface Report {
  headline: string; period: string; focus: string; confidence_level: string; output_type?: OutputType;
  sections: ReportSection[]; charts: Chart[]; timeseries?: { monthly_series?: MonthMetric[]; items?: Metric[] };
  audit?: Record<string, any>; evidence_audit?: Record<string, any>; data_provenance?: Record<string, any>;
  anomaly_warnings?: Record<string, any>[]; revision_watch?: Record<string, any>[];
  currency?: "USD" | "KRW"; analysis_options?: Partial<RunRequest>;
}
export interface TimelineEvent { id: number; name: string; payload: Record<string, any>; stage: string; agent: AgentKey }
