import type { Paper, CitationEdge } from "@/lib/api";

export const paper = (over: Partial<Paper> = {}): Paper => ({
  id: 1,
  title: "Attention Is All You Need",
  year: 2017,
  abstract: null,
  venue: null,
  authors: ["A. Vaswani", "N. Shazeer"],
  arxiv_id: "1706.03762",
  doi: null,
  s2_id: null,
  openalex_id: null,
  pdf_url: null,
  citation_count: 100,
  in_library: true,
  reading_status: null,
  ...over,
});

export const edge = (over: Partial<CitationEdge> = {}): CitationEdge => ({
  citing_id: 2,
  cited_id: 1,
  contexts: [],
  intents: [],
  is_influential: false,
  source: "s2",
  ...over,
});

import type { Recommendation, ReadingStep } from "@/lib/api";

export const rec = (over: Partial<Recommendation> = {}): Recommendation => ({
  paper: paper({ id: 10, title: "Deep RL from Human Preferences", year: 2017, in_library: false }),
  score: 0.9,
  reasons: [
    { kind: "cocitation", text: "Cited together with", evidence_paper_ids: [1] },
    { kind: "similar", text: "Similar in topic to what you're reading", evidence_paper_ids: [] },
  ],
  ...over,
});

export const step = (over: Partial<ReadingStep> = {}): ReadingStep => ({
  paper: paper({ id: 5, title: "Neural Machine Translation", in_library: false, reading_status: null }),
  reason: "Introduces attention, which the target relies on",
  concepts: [{ id: 3, name: "Attention", aliases: [], description: null, kind: "technique" }],
  score: 0.8,
  ...over,
});
