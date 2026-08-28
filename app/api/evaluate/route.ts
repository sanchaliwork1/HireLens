import { NextRequest, NextResponse } from "next/server"
import { runEvaluation } from "@/lib/pipeline"

export const runtime = "nodejs"
// This makes 4 sequential round-trips to Claude (profile -> agents -> debate -> decision).
// Default Vercel Hobby functions time out at 10s, which is NOT enough. Either:
//  1) bump this (needs a Pro plan for >60s), or
//  2) switch to the streaming version described in the chat answer.
export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { jobTitle, jobDescription, resumeText, transcriptText } = body ?? {}

    if (!jobTitle || !jobDescription || !resumeText || !transcriptText) {
      return NextResponse.json(
        { error: "jobTitle, jobDescription, resumeText and transcriptText are all required." },
        { status: 400 },
      )
    }

    const report = await runEvaluation({ jobTitle, jobDescription, resumeText, transcriptText })
    return NextResponse.json(report)
  } catch (err) {
    console.error("evaluate error", err)
    const message = err instanceof Error ? err.message : "Evaluation failed."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
