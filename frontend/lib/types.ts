// Types mirrored exactly from docs/api.md

export type ReadingStatus = "unread" | "reading" | "read" | null;

export interface Paper {
  id: number;
  title: string;
  year: number | null;
  abstract: string | null;
  venue: string | null;
  authors: string[];
  arxiv_id: string | null;
  doi: string | null;
  s2_id: string | null;
  openalex_id: string | null;
  pdf_url: string | null;
  citation_count: number | null;
  in_library: boolean;
  reading_status: ReadingStatus;
  updated_at?: string;
}

export interface CitationEdge {
  citing_id: number;
  cited_id: number;
  contexts: string[];
  intents: string[];
  is_influential: boolean;
  source: "s2" | "openalex" | "grobid";
}

export type JobStatus = "queued" | "running" | "done" | "failed";

export interface Job {
  id: number;
  kind: string;
  status: JobStatus;
  error: string | null;
  created_at: string;
}

export interface Collection {
  id: number;
  name: string;
  paper_ids: number[];
}

export interface PaperEdgeItem {
  paper: Paper;
  edge: CitationEdge;
}

export interface GraphResponse {
  nodes: Paper[];
  edges: CitationEdge[];
  root_id: number;
}

export type ConceptKind = "technique" | "math" | "hypothesis" | "task" | "other";

export interface Concept {
  id: number;
  name: string;
  aliases: string[];
  description: string | null;
  kind: ConceptKind;
}

export interface Evidence {
  paper_id: number;
  quote: string;
  section: string | null;
}

export type RelationType = "introduces" | "extends" | "applies" | "improves" | "challenges";

export interface ConceptRelation {
  from_paper_id: number;
  to_paper_id: number;
  concept_id: number;
  relation: RelationType;
  basis: "citation" | "inferred";
  confidence: number;
  evidence: Evidence[];
}

export interface PaperConceptItem {
  concept: Concept;
  role: "introduces" | "uses";
  evidence: Evidence[];
}

export interface Lineage {
  concept: Concept;
  papers: Paper[];
  relations: ConceptRelation[];
}

export type KnowledgeState = "known" | "partial" | "unknown";

export interface ProfileItem {
  concept: Concept;
  state: KnowledgeState;
}

export interface PrerequisiteItem {
  concept: Concept;
  evidence: Evidence[];
}

export interface ReadingStep {
  paper: Paper;
  reason: string;
  concepts: Concept[];
  score: number;
}

export interface ReadingPath {
  target: Paper;
  steps: ReadingStep[];
}

export type GraphDirection = "up" | "down" | "both";

export type RecMode = "balanced" | "foundations" | "frontier";
export type RecAction = "dismiss" | "save" | "not_relevant";
export type RecReasonKind = "graph" | "cocitation" | "method" | "prereq" | "similar" | "frontier" | "impact";

export interface RecReason {
  kind: RecReasonKind;
  text: string;
  evidence_paper_ids: number[];
}

export interface Recommendation {
  paper: Paper;
  score: number;
  reasons: RecReason[];
}

export type PaperSort = "recent" | "added" | "year" | "citations" | "title";

export interface User {
  id: number;
  email: string;
  is_admin: boolean;
  created_at: string;
}
export interface AuthConfig {
  allow_signup: boolean;
  invite_signup: boolean;
  dev_autologin: boolean;
}
export interface AdminUser extends User {
  active_sessions: number;
  last_seen: string | null;
  library_size: number;
}
export interface AdminInvite {
  id: number;
  created_by: number | null;
  created_at: string;
  expires_at: string;
  used_by: number | null;
  used_at: string | null;
}
