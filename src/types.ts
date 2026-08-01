export type Stage = "manager" | "data" | "trade" | "visualization" | "planner" | "news" | "rca" | "writer" | "qa" | "completed" | "error";

export interface ResearchRequest {
  countries: string[];
  products: string[];
  unit: string;
  length: number;
  start_period: string;
  end_period: string;
  title?: string;
}

export interface ResearchDataAvailability {
  available: boolean;
  message: string;
  matching_sources: Array<{
    file_path: string;
    sheet_name: string;
    purpose: string;
  }>;
  matching_record_count: number;
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
  claims: Array<{ claim_id: string; text: string; trade_evidence_ids: string[]; web_evidence_ids: string[]; scholar_evidence_ids: string[] }>;
  references: string[];
  markdown: string;
}

export interface ResearchResult {
  request: ResearchRequest;
  data_check: Record<string, unknown> | null;
  trade_analysis: Record<string, unknown>;
  anomaly_points: Record<string, unknown>[];
  visualization: { html: string; theme: string; description: string; provider: string } | null;
  report_plan: Record<string, unknown> | null;
  news_analysis: Record<string, unknown>;
  rca_analysis: Record<string, unknown> | null;
  report: ReportDraft;
  qa: Record<string, unknown>;
  revision_count: number;
}

export interface RunDetail extends RunSummary {
  request: ResearchRequest;
  result: ResearchResult | null;
}
