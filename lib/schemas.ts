// JSON Schemas passed to Claude as forced tool input, and the matching
// TypeScript types used everywhere else in the app.

export type SourceDoc = "resume" | "transcript"

export interface Claim {
  claim: string
  source: SourceDoc
  quote: string
}

export interface CandidateProfile {
  name: string
  targetRole: string
  skillsClaimed: string[]
  yearsExperience: string
  keyClaims: Claim[]
  notes: string
}

export interface Evidence {
  quote: string
  source: SourceDoc
  relevance: string
}

export type AgentId = "technical" | "hr" | "hiring_manager" | "skeptic"

export interface AgentOpinion {
  agent: AgentId
  verdict: string
  confidence: number | null // 0-100, null = insufficient information
  confidenceReason: string
  reasoning: string
  evidence: Evidence[]
  openQuestions: string[]
}

export type DebateStance = "agree" | "disagree" | "revise" | "open_question"

export interface DebateTurn {
  speaker: AgentId
  respondingTo: AgentId | null
  stance: DebateStance
  message: string
}

export interface OpinionRevision {
  agent: AgentId
  from: string
  to: string
  triggeredBy: AgentId
  reason: string
}

export interface DebateResult {
  turns: DebateTurn[]
  revisions: OpinionRevision[]
  unresolvedDisagreements: string[]
}

export type Recommendation =
  | "Strong Hire"
  | "Hire"
  | "Lean Hire"
  | "No Hire"
  | "Insufficient Information"

export interface FinalDecision {
  recommendation: Recommendation
  confidenceLevel: "High" | "Medium" | "Low"
  reasoningSummary: string
  strengths: string[]
  concerns: string[]
  unresolvedDisagreements: string[]
  evidenceGaps: string[]
}

export interface EvaluationReport {
  candidateName: string
  profile: CandidateProfile
  opinions: Record<AgentId, AgentOpinion>
  debate: DebateResult
  finalDecision: FinalDecision
}

// ---- JSON Schemas (for Anthropic tool input_schema) ----

const claimSchema = {
  type: "object",
  properties: {
    claim: { type: "string" },
    source: { type: "string", enum: ["resume", "transcript"] },
    quote: { type: "string", description: "Direct quote, max ~25 words, copied verbatim from the source." },
  },
  required: ["claim", "source", "quote"],
}

export const profileSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    targetRole: { type: "string" },
    skillsClaimed: { type: "array", items: { type: "string" } },
    yearsExperience: { type: "string" },
    keyClaims: { type: "array", items: claimSchema },
    notes: {
      type: "string",
      description: "Gaps, ambiguities, or things not covered by the source documents. No evaluation/scoring here.",
    },
  },
  required: ["name", "targetRole", "skillsClaimed", "yearsExperience", "keyClaims", "notes"],
}

const evidenceSchema = {
  type: "object",
  properties: {
    quote: { type: "string", description: "Direct quote, max ~25 words, copied verbatim from resume or transcript." },
    source: { type: "string", enum: ["resume", "transcript"] },
    relevance: { type: "string", description: "One sentence on why this quote supports the point being made." },
  },
  required: ["quote", "source", "relevance"],
}

export function agentOpinionSchema(agentId: AgentId) {
  return {
    type: "object",
    properties: {
      agent: { type: "string", enum: [agentId] },
      verdict: { type: "string", description: "One short headline, e.g. 'Strong technical fit'." },
      confidence: {
        type: ["number", "null"],
        description: "0-100. Use null ONLY if there truly isn't enough evidence to judge this dimension.",
      },
      confidenceReason: {
        type: "string",
        description: "Required. If confidence is null, explain exactly what information is missing.",
      },
      reasoning: { type: "string" },
      evidence: { type: "array", items: evidenceSchema, minItems: 1 },
      openQuestions: { type: "array", items: { type: "string" } },
    },
    required: ["agent", "verdict", "confidence", "confidenceReason", "reasoning", "evidence", "openQuestions"],
  }
}

export const debateSchema = {
  type: "object",
  properties: {
    turns: {
      type: "array",
      items: {
        type: "object",
        properties: {
          speaker: { type: "string", enum: ["technical", "hr", "hiring_manager", "skeptic"] },
          respondingTo: { type: ["string", "null"], enum: ["technical", "hr", "hiring_manager", "skeptic", null] },
          stance: { type: "string", enum: ["agree", "disagree", "revise", "open_question"] },
          message: { type: "string" },
        },
        required: ["speaker", "respondingTo", "stance", "message"],
      },
      minItems: 4,
    },
    revisions: {
      type: "array",
      description: "Every time a persona's opinion actually changed as a direct result of another persona's point.",
      items: {
        type: "object",
        properties: {
          agent: { type: "string", enum: ["technical", "hr", "hiring_manager", "skeptic"] },
          from: { type: "string" },
          to: { type: "string" },
          triggeredBy: { type: "string", enum: ["technical", "hr", "hiring_manager", "skeptic"] },
          reason: { type: "string" },
        },
        required: ["agent", "from", "to", "triggeredBy", "reason"],
      },
    },
    unresolvedDisagreements: { type: "array", items: { type: "string" } },
  },
  required: ["turns", "revisions", "unresolvedDisagreements"],
}

export const finalDecisionSchema = {
  type: "object",
  properties: {
    recommendation: {
      type: "string",
      enum: ["Strong Hire", "Hire", "Lean Hire", "No Hire", "Insufficient Information"],
    },
    confidenceLevel: { type: "string", enum: ["High", "Medium", "Low"] },
    reasoningSummary: {
      type: "string",
      description:
        "Explain HOW you weighed the four opinions and the debate (not an average). Name which agent's evidence mattered most and why.",
    },
    strengths: { type: "array", items: { type: "string" } },
    concerns: { type: "array", items: { type: "string" } },
    unresolvedDisagreements: { type: "array", items: { type: "string" } },
    evidenceGaps: { type: "array", items: { type: "string" } },
  },
  required: [
    "recommendation",
    "confidenceLevel",
    "reasoningSummary",
    "strengths",
    "concerns",
    "unresolvedDisagreements",
    "evidenceGaps",
  ],
}
