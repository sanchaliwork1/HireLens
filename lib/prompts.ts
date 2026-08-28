import type { AgentId, AgentOpinion, CandidateProfile } from "./schemas"

interface Docs {
  jobTitle: string
  jobDescription: string
  resumeText: string
  transcriptText: string
}

export function profilePrompt({ jobTitle, jobDescription, resumeText, transcriptText }: Docs) {
  const system = `You are a neutral profile builder for a hiring panel. You do NOT evaluate, score, or judge the candidate — that happens in a later, separate stage. Your only job is to extract facts and claims that are explicitly present in the source documents. Every entry in keyClaims must carry a short verbatim quote (max ~25 words) from either the resume or the transcript. Never infer or invent a claim that isn't traceable to the text. If something relevant to the role is simply missing from the documents, record that in "notes" instead of guessing.`

  const prompt = `ROLE: ${jobTitle}

JOB DESCRIPTION:
${jobDescription}

RESUME:
${resumeText}

INTERVIEW TRANSCRIPT:
${transcriptText}

Build the candidate profile now.`

  return { system, prompt }
}

const AGENT_LABEL: Record<AgentId, string> = {
  technical: "Technical Reviewer",
  hr: "HR / Culture Reviewer",
  hiring_manager: "Hiring Manager",
  skeptic: "Skeptic",
}

const AGENT_BRIEF: Record<AgentId, string> = {
  technical: `Assess technical skill and depth ONLY. Look for evidence of real hands-on experience versus surface-level buzzwords. Distinguish claims backed by specifics (architecture decisions, trade-offs, numbers they can explain) from vague or unverified claims. Ignore communication style and cultural fit — that's not your lane.`,
  hr: `Assess communication, teamwork, self-awareness and honesty ONLY. Look at how the candidate talks about mistakes, disagreements, and collaboration. Ignore raw technical depth and whether they're "worth hiring" — that's not your lane.`,
  hiring_manager: `Assess overall role fit ONLY: given everything in the profile, would you hire this specific person for THIS specific role, at this specific time? Weigh technical requirements from the job description against what the candidate has actually demonstrated, including gaps they were upfront about. Consider ramp-up cost and risk, not just talent.`,
  skeptic: `Your ONLY job is to find contradictions, exaggeration, unverifiable claims, and red flags. Actively compare resume language against transcript language and flag any place they don't line up. It is fine — expected — for you to be harsher than the other reviewers. Do not soften a real inconsistency to be polite.`,
}

export function agentPrompt(
  agentId: AgentId,
  profile: CandidateProfile,
  { jobTitle, jobDescription, resumeText, transcriptText }: Docs,
) {
  const system = `You are the ${AGENT_LABEL[agentId]} on a multi-agent hiring panel. You are working INDEPENDENTLY — you have not seen and must not guess at what any other reviewer thinks. ${AGENT_BRIEF[agentId]}

Hard rules:
- Every claim you make must be backed by a direct quote from the resume or transcript in your "evidence" array. No unexplained scores.
- If you genuinely don't have enough evidence to judge something, set confidence to null and explain exactly what's missing in confidenceReason. Do not make up a number to fill the field.
- Stay inside your lane described above. Other reviewers are covering the other angles.`

  const prompt = `ROLE: ${jobTitle}

JOB DESCRIPTION:
${jobDescription}

CANDIDATE PROFILE (extracted facts, not yet evaluated):
${JSON.stringify(profile, null, 2)}

FULL RESUME:
${resumeText}

FULL INTERVIEW TRANSCRIPT:
${transcriptText}

Give your independent opinion now.`

  return { system, prompt }
}

export function debatePrompt(profile: CandidateProfile, opinions: Record<AgentId, AgentOpinion>) {
  const system = `You are moderating a debate between four hiring-panel personas: Technical Reviewer, HR / Culture Reviewer, Hiring Manager, and Skeptic. Each already gave an independent opinion (below) without seeing the others. Now let them actually engage with each other.

Hard rules:
- At least one turn MUST have a persona directly respond to another persona's specific point (agree, disagree, or reconsider) — not just restate their own opinion again.
- If a persona's stance genuinely shifts because of another persona's point, add an entry to "revisions" describing exactly what changed and why. Don't invent revisions that didn't really happen — it's fine if nobody changes their mind, but then revisions should be empty.
- Do not introduce new evidence that wasn't in the profile, resume, or transcript excerpts already given. Ground every argument in what the personas already said.
- Anything that's still genuinely contested after the debate belongs in "unresolvedDisagreements" — don't force false consensus.`

  const prompt = `CANDIDATE PROFILE:
${JSON.stringify(profile, null, 2)}

INDEPENDENT OPINIONS (each persona has NOT seen the others yet — that's what you're simulating now):

TECHNICAL:
${JSON.stringify(opinions.technical, null, 2)}

HR / CULTURE:
${JSON.stringify(opinions.hr, null, 2)}

HIRING MANAGER:
${JSON.stringify(opinions.hiring_manager, null, 2)}

SKEPTIC:
${JSON.stringify(opinions.skeptic, null, 2)}

Run the debate now.`

  return { system, prompt }
}

export function finalDecisionPrompt(
  profile: CandidateProfile,
  opinions: Record<AgentId, AgentOpinion>,
  debate: { turns: unknown; revisions: unknown; unresolvedDisagreements: unknown },
) {
  const system = `You are the final decision-maker for a hiring panel. You have the candidate profile, four independent opinions, and the transcript of their debate (including any opinion revisions). 

Hard rule: DO NOT average the four confidence scores. Instead, reason explicitly about which agent's evidence is strongest and most relevant to this specific role, how the debate changed (or didn't change) the reliability of each opinion, and what a human hiring manager would actually need to know. Your reasoningSummary must show this weighing process, not just restate the scores. If a critical piece of information is missing across every agent, recommendation should be "Insufficient Information" rather than a guess.`

  const prompt = `CANDIDATE PROFILE:
${JSON.stringify(profile, null, 2)}

INDEPENDENT OPINIONS:
${JSON.stringify(opinions, null, 2)}

DEBATE TRANSCRIPT (including revisions and unresolved disagreements):
${JSON.stringify(debate, null, 2)}

Make the final call now.`

  return { system, prompt }
}
