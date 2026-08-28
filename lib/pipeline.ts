import { callStructured } from "./anthropic"
import { agentPrompt, debatePrompt, finalDecisionPrompt, profilePrompt } from "./prompts"
import {
  agentOpinionSchema,
  debateSchema,
  finalDecisionSchema,
  profileSchema,
  type AgentId,
  type AgentOpinion,
  type CandidateProfile,
  type DebateResult,
  type EvaluationReport,
  type FinalDecision,
} from "./schemas"

export interface PipelineInput {
  jobTitle: string
  jobDescription: string
  resumeText: string
  transcriptText: string
}

const AGENT_IDS: AgentId[] = ["technical", "hr", "hiring_manager", "skeptic"]

async function runAgent(agentId: AgentId, profile: CandidateProfile, input: PipelineInput): Promise<AgentOpinion> {
  const { system, prompt } = agentPrompt(agentId, profile, input)
  return callStructured<AgentOpinion>({
    system,
    prompt,
    toolName: "submit_opinion",
    toolDescription: `Submit this reviewer's independent, evidence-backed opinion.`,
    inputSchema: agentOpinionSchema(agentId),
  })
}

/**
 * Full multi-agent evaluation for a single candidate.
 * Stages run in this order and each is a SEPARATE model call, so the
 * independent agents genuinely cannot see each other's conclusions:
 *   1. Candidate Profile Builder (1 call)
 *   2. Four independent agents (4 parallel calls, no shared context between them)
 *   3. Debate (1 call, only run once all four opinions above exist)
 *   4. Final decision (1 call)
 */
export async function runEvaluation(input: PipelineInput, onStage?: (stage: string) => void): Promise<EvaluationReport> {
  onStage?.("profile")
  const { system: profSys, prompt: profPrompt } = profilePrompt(input)
  const profile = await callStructured<CandidateProfile>({
    system: profSys,
    prompt: profPrompt,
    toolName: "submit_profile",
    toolDescription: "Submit the extracted, evidence-backed candidate profile.",
    inputSchema: profileSchema,
  })

  onStage?.("independent_agents")
  const [technical, hr, hiring_manager, skeptic] = await Promise.all(
    AGENT_IDS.map((id) => runAgent(id, profile, input)),
  )
  const opinions: Record<AgentId, AgentOpinion> = { technical, hr, hiring_manager, skeptic }

  onStage?.("debate")
  const { system: debSys, prompt: debPrompt } = debatePrompt(profile, opinions)
  const debate = await callStructured<DebateResult>({
    system: debSys,
    prompt: debPrompt,
    toolName: "submit_debate",
    toolDescription: "Submit the simulated panel debate, including any real opinion revisions.",
    inputSchema: debateSchema,
  })

  onStage?.("final_decision")
  const { system: finSys, prompt: finPrompt } = finalDecisionPrompt(profile, opinions, debate)
  const finalDecision = await callStructured<FinalDecision>({
    system: finSys,
    prompt: finPrompt,
    toolName: "submit_final_decision",
    toolDescription: "Submit the final, evidence-weighted hiring decision. Never a simple average of the scores.",
    inputSchema: finalDecisionSchema,
  })

  onStage?.("done")
  return {
    candidateName: profile.name,
    profile,
    opinions,
    debate,
    finalDecision,
  }
}
