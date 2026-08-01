export type Stage = "manager" | "data" | "trade" | "visualization" | "planner" | "news" | "rca" | "writer" | "qa" | "completed" | "error";

export interface ResearchRequest {
  countries: string[];
  products: string[];
  unit: string;
  length: number;
  start_period: string;
  end_period: string;
  analysis_frequency?: AnalysisFrequency;
  comparison_basis?: ComparisonBasis[];
  title?: string;
  additional_prompt?: string;
  word_count?: number;
}

export type AnalysisFrequency = "monthly" | "quarterly" | "half_yearly" | "yearly" | "custom";
export type ComparisonBasis = "previous_period" | "same_period_previous_year" | "historical_average" | "cagr";

export interface ResearchDataAvailability {
  available: boolean;
  message: string;
  matching_sources: Array<{
    file_path: string;
    sheet_name: string;
    purpose: string;
  }>;
  matching_record_count: number;
  matching_countries: string[];
  matching_products: string[];
  estimated_context_tokens: number;
  context_budget_tokens: number;
  context_usage_percent: number;
  context_level: "low" | "medium" | "high" | "critical";
  context_safe: boolean;
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
  visualization_ids?: string[];
  references: string[];
  markdown: string;
}

export interface ChartArtifact {
  chart_id: string;
  template_id: string;
  title: string;
  caption: string;
  source_note: string;
  renderer: "matplotlib" | "liner_viz";
  category: "overview" | "anomaly" | "structure" | "competitiveness" | "decomposition" | "data_quality";
  file_path?: string | null;
  html?: string | null;
  image_data_url?: string | null;
  chart_type?: string | null;
  effective_template_id: string;
  fallback_used: boolean;
  anomaly_ids: string[];
  metric_ids: string[];
  key_observations: string[];
  limitations: string[];
  observation_count: number;
  band_observation_count: number;
  description: string;
}

export interface VisualizationResult {
  html: string;
  theme: string;
  description: string;
  provider: string;
  visualization_id?: string;
  chart_artifacts?: ChartArtifact[];
}

export interface ResearchResult {
  request: ResearchRequest;
  data_check: Record<string, unknown> | null;
  trade_analysis: Record<string, unknown>;
  anomaly_points: Record<string, unknown>[];
  visualization: VisualizationResult | null;
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
