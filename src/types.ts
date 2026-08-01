export type Stage = "manager" | "planner" | "trade" | "news" | "gvc" | "writer" | "qa" | "completed" | "error";

export interface ResearchRequest {
  countries: string[];
  products: string[];
  unit: string;
  length: number;
  start_period: string;
  end_period: string;
  title?: string;
}

export interface TimelineEvent {
  id: string;
  runId: string;
  event: string;
  stage: Stage;
  message: string;
  payload?: Record<string, unknown>;
  time: Date;
}

export interface RunSummary {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  current_stage: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportSection {
  heading: string;
  content: string;
}

export interface ReportDraft {
  title: string;
  executive_summary: string;
  sections: ReportSection[];
  conclusion: string;
  limitations: string[];
  references: string[];
  markdown: string;
}

export interface ResearchResult {
  request: ResearchRequest;
  plan: Record<string, unknown>;
  trade_analysis: Record<string, unknown>;
  news_analysis: Record<string, unknown>;
  gvc_analysis: Record<string, unknown>;
  report: ReportDraft;
  qa: Record<string, unknown>;
  revision_count: number;
}

export interface RunDetail extends RunSummary {
  request: ResearchRequest;
  result: ResearchResult | null;
}
