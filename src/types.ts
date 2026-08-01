export type Mode = "fast" | "live" | "full";
export type OutputType = "report" | "paper";
export type AgentKey = "terra" | "code" | "luna" | "sol" | "liner";

export interface RunRequest { input: string; mode: Mode; output_type: OutputType }
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
}
export interface TimelineEvent { id: number; name: string; payload: Record<string, any>; stage: string; agent: AgentKey }
