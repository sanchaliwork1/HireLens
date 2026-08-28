'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight, Check, ChevronRight, CircleAlert, Code2, FileText, Menu, Moon,
  Network, PanelRight, ShieldCheck, Sparkles, Sun, Users, X, Zap, Trash2, TriangleAlert,
} from 'lucide-react'
import type { AgentId, EvaluationReport } from '@/lib/schemas'

// ---------- static panel metadata (labels/icons/colors only — no fake data) ----------
const AGENT_META: Record<AgentId, { label: string; color: string; icon: any; blurb: string }> = {
  technical: { label: 'Technical', color: 'blue', icon: Code2, blurb: 'Does the candidate actually have the technical depth?' },
  hr: { label: 'HR / Culture', color: 'mint', icon: Users, blurb: 'How do they communicate, collaborate and handle situations?' },
  hiring_manager: { label: 'Hiring Manager', color: 'peach', icon: Zap, blurb: 'Would I hire this person for THIS role?' },
  skeptic: { label: 'Skeptic', color: 'coral', icon: CircleAlert, blurb: "What doesn't add up?" },
}
const AGENT_ORDER: AgentId[] = ['technical', 'hr', 'hiring_manager', 'skeptic']

const STAGES = [
  'Documents received',
  'Building candidate profile',
  'Technical review',
  'HR / Culture review',
  'Hiring Manager review',
  'Skeptic review',
  'Panel debate',
  'Final reasoning',
]

// ---------- shared chrome ----------
function Logo() { return <div className="logo"><span className="logo-mark"><Network size={17} /></span><span>Hire<span className="logo-accent">Lens</span></span></div> }
function ThemeToggle() { const [dark, setDark] = useState(true); return <button className="theme-toggle" onClick={() => { setDark(!dark); document.documentElement.classList.toggle('dark', !dark) }} aria-label="Toggle theme">{dark ? <Moon size={15} /> : <Sun size={15} />}<span>{dark ? 'Dark' : 'Light'}</span></button> }
function Header({ onStart }: { onStart: () => void }) {
  const [open, setOpen] = useState(false)
  return <header className="header"><div className="nav"><Logo /><nav className={open ? 'mobile-open' : ''}>{['Evaluate', 'Agents', 'Debate'].map((x) => <a key={x} href={`#${x.toLowerCase().replaceAll(' ', '-')}`} onClick={() => setOpen(false)}>{x}</a>)}<button className="nav-cta" onClick={onStart}>New evaluation <ArrowRight size={15} /></button></nav><div className="nav-tools"><ThemeToggle /><button className="hamburger" onClick={() => setOpen(!open)} aria-label="Open menu">{open ? <X /> : <Menu />}</button></div></div></header>
}
function AgentOrbit() {
  return <div className="orbit"><div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" /><div className="orbit-core"><ShieldCheck size={22} /><span>FINAL<br />REVIEW</span><small>Human decision required</small></div>{AGENT_ORDER.map((id, i) => { const a = AGENT_META[id]; const I = a.icon; return <div className={`orbit-agent orbit-${i}`} key={id}><div className={`agent-icon ${a.color}`}><I size={17} /></div><div><b>{a.label}</b><span>Independent reviewer</span></div></div> })}</div>
}
function Landing({ onStart }: { onStart: () => void }) {
  return <>
    <section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="pulse" /> AI HIRING PANEL <span className="eyebrow-rule" /> LIVE</div><h1>Four perspectives.<br /><em>One</em> evidence-backed decision.</h1><p className="hero-lede">Upload a resume and interview transcript. Four independent AI reviewers evaluate the candidate, debate their disagreements, and reach a reasoned final call.</p><div className="hero-actions"><button className="primary" onClick={onStart}>Start evaluation <ArrowRight size={17} /></button></div><p className="disclaimer"><ShieldCheck size={14} /> Advisory intelligence for human hiring teams — always ends with a human decision.</p></div><AgentOrbit /></section>
    <section className="section lavender" id="agents"><div className="section-intro"><span className="section-kicker">01 / THE PANEL</span><h2>One candidate.<br /><span>Four perspectives.</span></h2><p>No single model sees the whole picture. Each reviewer forms an opinion independently, before anyone sees anyone else's.</p></div><div className="agent-grid">{AGENT_ORDER.map((id, i) => { const a = AGENT_META[id]; const I = a.icon; return <article className={`agent-tile ${a.color}`} key={id}><div className="tile-top"><div className="agent-icon"><I size={20} /></div><span>0{i + 1}</span></div><h3>{a.label}</h3><p>{a.blurb}</p></article> })}</div></section>
    <section className="section debate-preview" id="debate"><div className="debate-heading"><span className="section-kicker">02 / THE DEBATE</span><h2>AI doesn't just score.<br /><span>It argues.</span></h2><p>After independent review, the panel debates disagreements before a separate reasoning step weighs the evidence — never a simple average.</p></div></section>
    <section className="final-cta"><div><span className="section-kicker">READY WHEN YOU ARE</span><h2>Ready to see what<br /><em>the panel thinks?</em></h2></div><button className="primary light" onClick={onStart}>Evaluate a candidate <ArrowRight size={17} /></button></section>
  </>
}

// ---------- data model for the live flow ----------
type FileStatus = 'idle' | 'loading' | 'ok' | 'error'
interface CandidateInput {
  id: string
  label: string
  resumeText: string
  resumeName: string
  resumeStatus: FileStatus
  resumeError: string
  transcriptText: string
  transcriptName: string
  transcriptStatus: FileStatus
  transcriptError: string
}
function newCandidate(label: string): CandidateInput {
  return { id: crypto.randomUUID(), label, resumeText: '', resumeName: '', resumeStatus: 'idle', resumeError: '', transcriptText: '', transcriptName: '', transcriptStatus: 'idle', transcriptError: '' }
}

async function extractText(file: File): Promise<{ text: string } | { error: string }> {
  try {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/extract-text', { method: 'POST', body: form })
    const data = await res.json()
    if (!res.ok) return { error: data.error || 'Failed to read file.' }
    return { text: data.text }
  } catch {
    return { error: 'Network error while uploading. Is the dev server running?' }
  }
}

function UploadSlot({
  label, filename, status, error, onFile,
}: { label: string; filename: string; status: FileStatus; error: string; onFile: (f: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div>
      <button type="button" className="upload-box" onClick={() => inputRef.current?.click()}>
        <div className={`file-icon ${status === 'ok' ? 'blue' : 'peach'}`}><FileText size={21} /></div>
        <div>
          <b>{filename || label}</b>
          <span>{status === 'idle' ? 'PDF or TXT' : status === 'loading' ? 'Extracting text…' : status === 'ok' ? 'Ready' : 'Upload failed — tap to retry'}</span>
        </div>
        <span className="upload-action">{status === 'ok' ? <Check size={18} /> : '+'}</span>
      </button>
      <input ref={inputRef} type="file" accept=".pdf,.txt,.md" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
      {status === 'error' && <p className="file-status err"><TriangleAlert size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />{error}</p>}
    </div>
  )
}

function Evaluation({ onBack }: { onBack: () => void }) {
  const [jobTitle, setJobTitle] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [candidates, setCandidates] = useState<CandidateInput[]>([newCandidate('Candidate A'), newCandidate('Candidate B')])
  const [phase, setPhase] = useState<'setup' | 'processing' | 'report'>('setup')
  const [reports, setReports] = useState<Record<string, EvaluationReport>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState<string>('')

  function updateCandidate(id: string, patch: Partial<CandidateInput>) {
    setCandidates((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  async function handleFile(id: string, kind: 'resume' | 'transcript', file: File) {
    updateCandidate(id, kind === 'resume' ? { resumeStatus: 'loading', resumeName: file.name } : { transcriptStatus: 'loading', transcriptName: file.name })
    const result = await extractText(file)
    if ('error' in result) {
      updateCandidate(id, kind === 'resume' ? { resumeStatus: 'error', resumeError: result.error } : { transcriptStatus: 'error', transcriptError: result.error })
    } else {
      updateCandidate(id, kind === 'resume' ? { resumeStatus: 'ok', resumeText: result.text } : { transcriptStatus: 'ok', transcriptText: result.text })
    }
  }

  const ready = jobTitle.trim() && jobDescription.trim() && candidates.length > 0 &&
    candidates.every((c) => c.resumeStatus === 'ok' && c.transcriptStatus === 'ok')

  async function beginEvaluation() {
    setPhase('processing')
    setErrors({})
    const results = await Promise.allSettled(
      candidates.map((c) =>
        fetch('/api/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobTitle, jobDescription, resumeText: c.resumeText, transcriptText: c.transcriptText }),
        }).then(async (res) => {
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Evaluation failed')
          return data as EvaluationReport
        }),
      ),
    )
    const nextReports: Record<string, EvaluationReport> = {}
    const nextErrors: Record<string, string> = {}
    results.forEach((r, i) => {
      const id = candidates[i].id
      if (r.status === 'fulfilled') nextReports[id] = r.value
      else nextErrors[id] = r.reason?.message || 'Evaluation failed'
    })
    setReports(nextReports)
    setErrors(nextErrors)
    setActiveTab(Object.keys(nextReports)[0] || candidates[0]?.id || '')
    setPhase('report')
  }

  if (phase === 'processing') return <Processing candidateCount={candidates.length} />
  if (phase === 'report') return (
    <Report
      candidates={candidates}
      reports={reports}
      errors={errors}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onBack={onBack}
      onNewEvaluation={() => { setPhase('setup'); setReports({}); setErrors({}) }}
    />
  )

  return (
    <main className="workspace">
      <div className="workspace-top"><button className="back" onClick={onBack}>← Back to overview</button></div>
      <div className="workspace-heading"><div><span className="section-kicker">NEW EVALUATION</span><h1>Let's look closer.</h1><p>Upload each candidate's resume and interview transcript, and describe the role.</p></div></div>
      <div className="eval-layout">
        <section className="upload-panel">
          <h2>Candidates</h2>
          <p className="muted">Each candidate is evaluated independently by the full panel.</p>
          {candidates.map((c) => (
            <div className="candidate-block" key={c.id}>
              <div className="candidate-block-head">
                <input
                  style={{ margin: 0, border: 0, background: 'transparent', padding: 0, fontWeight: 800, fontSize: 13, width: 'auto' }}
                  value={c.label}
                  onChange={(e) => updateCandidate(c.id, { label: e.target.value })}
                />
                {candidates.length > 1 && (
                  <button className="remove-candidate" onClick={() => setCandidates((cs) => cs.filter((x) => x.id !== c.id))}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              <UploadSlot label="Resume" filename={c.resumeName} status={c.resumeStatus} error={c.resumeError} onFile={(f) => handleFile(c.id, 'resume', f)} />
              <UploadSlot label="Interview transcript" filename={c.transcriptName} status={c.transcriptStatus} error={c.transcriptError} onFile={(f) => handleFile(c.id, 'transcript', f)} />
            </div>
          ))}
          <button className="add-candidate" onClick={() => setCandidates((cs) => [...cs, newCandidate(`Candidate ${String.fromCharCode(65 + cs.length)}`)])}>+ Add another candidate</button>
          <div className="privacy"><ShieldCheck size={16} /><span><b>Private by design</b> Documents are sent only to your own Claude API key for this evaluation.</span></div>
        </section>
        <section className="role-panel">
          <h2>Role information</h2>
          <p className="muted">What should the panel evaluate against?</p>
          <label>Job title<input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Senior Backend Engineer" /></label>
          <label>Job description<textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste the role description and core expectations…" /></label>
          <button className="primary begin" disabled={!ready} onClick={beginEvaluation}>Begin evaluation <ArrowRight size={17} /></button>
          {!ready && <p className="form-note">Add a job title, description, and finish uploading every candidate's resume + transcript to continue.</p>}
        </section>
      </div>
    </main>
  )
}

function Processing({ candidateCount }: { candidateCount: number }) {
  const [step, setStep] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setStep((s) => Math.min(STAGES.length - 2, s + 1)), 1300)
    return () => clearInterval(id)
  }, [])
  return (
    <main className="processing">
      <div className="processing-center">
        <div className="spinner"><Sparkles size={26} /></div>
        <span className="section-kicker">EVALUATION IN PROGRESS</span>
        <h1>The panel is deliberating…</h1>
        <p>Running {candidateCount} candidate{candidateCount > 1 ? 's' : ''} through the full pipeline: profile → four independent reviewers → debate → final decision.</p>
        <div className="progress-track"><div style={{ width: `${Math.min(100, ((step + 1) / STAGES.length) * 100)}%` }} /></div>
        <div className="stages">{STAGES.map((s, i) => <div className={i <= step ? 'stage done' : 'stage'} key={s}><span>{i <= step ? <Check size={13} /> : '○'}</span>{s}</div>)}</div>
      </div>
    </main>
  )
}

function confidenceLabel(c: number | null) {
  return c === null ? 'Insufficient info' : `${c}% confidence`
}

function decisionPillClass(rec: string) {
  if (rec.includes('Strong Hire') || rec === 'Hire') return 'hire'
  if (rec === 'Lean Hire') return 'lean'
  if (rec === 'No Hire') return 'no'
  return 'insufficient'
}

function Report({
  candidates, reports, errors, activeTab, setActiveTab, onBack, onNewEvaluation,
}: {
  candidates: CandidateInput[]
  reports: Record<string, EvaluationReport>
  errors: Record<string, string>
  activeTab: string
  setActiveTab: (id: string) => void
  onBack: () => void
  onNewEvaluation: () => void
}) {
  const report = reports[activeTab]
  const error = errors[activeTab]
  const activeCandidate = candidates.find((c) => c.id === activeTab)

  return (
    <main className="workspace">
      <div className="workspace-top">
        <button className="back" onClick={onBack}>← Back to overview</button>
        <button className="back" onClick={onNewEvaluation}>Run another evaluation</button>
      </div>
      <div className="workspace-heading"><div><span className="section-kicker">FINAL REPORT</span><h1>The panel has a point of view.</h1></div></div>

      {candidates.length > 1 && (
        <div className="candidate-tabs">
          {candidates.map((c) => (
            <button key={c.id} className={`candidate-tab ${activeTab === c.id ? 'active' : ''}`} onClick={() => setActiveTab(c.id)}>
              {reports[c.id]?.candidateName || c.label}{errors[c.id] ? ' ⚠' : ''}
            </button>
          ))}
        </div>
      )}

      <div className="report-wrap" style={{ padding: 0 }}>
        {error && <div className="error-banner"><TriangleAlert size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />{error}</div>}
        {!error && !report && <p className="muted">No report for this candidate.</p>}
        {report && (
          <>
            <div className="decision-banner">
              <div>
                <span className={`decision-pill ${decisionPillClass(report.finalDecision.recommendation)}`}>{report.finalDecision.recommendation}</span>
                <h2>{report.candidateName}</h2>
                <span className="confidence-tag">{report.finalDecision.confidenceLevel} confidence · {activeCandidate?.label}</span>
              </div>
              <p style={{ maxWidth: 420, fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{report.finalDecision.reasoningSummary}</p>
            </div>

            <div className="report-section two-col">
              <div>
                <h3>Strengths</h3>
                <ul className="list-plain">{report.finalDecision.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
              <div>
                <h3>Concerns</h3>
                <ul className="list-plain">{report.finalDecision.concerns.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
            </div>

            {(report.finalDecision.unresolvedDisagreements.length > 0 || report.finalDecision.evidenceGaps.length > 0) && (
              <div className="report-section two-col">
                {report.finalDecision.unresolvedDisagreements.length > 0 && (
                  <div><h3>Unresolved disagreement</h3><ul className="list-plain">{report.finalDecision.unresolvedDisagreements.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
                )}
                {report.finalDecision.evidenceGaps.length > 0 && (
                  <div><h3>Evidence gaps</h3><ul className="list-plain">{report.finalDecision.evidenceGaps.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
                )}
              </div>
            )}

            <div className="report-section">
              <h3>Four independent reviews</h3>
              <div className="opinion-grid">
                {AGENT_ORDER.map((id) => {
                  const op = report.opinions[id]
                  const meta = AGENT_META[id]
                  const I = meta.icon
                  return (
                    <div className="opinion-card" key={id}>
                      <div className="card-head">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className={`agent-icon ${meta.color}`} style={{ width: 26, height: 26 }}><I size={13} /></div>
                          <b>{meta.label}</b>
                        </div>
                        <span className={`conf ${op.confidence === null ? 'na' : ''}`}>{confidenceLabel(op.confidence)}</span>
                      </div>
                      <b style={{ fontSize: 13 }}>{op.verdict}</b>
                      <p>{op.reasoning}</p>
                      {op.confidence === null && <p style={{ color: 'var(--coral)' }}>{op.confidenceReason}</p>}
                      {op.evidence.slice(0, 2).map((e, i) => <div className="ev" key={i}>"{e.quote}" — {e.source}</div>)}
                      {op.openQuestions.length > 0 && <p><i>Open: {op.openQuestions.join('; ')}</i></p>}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="report-section">
              <h3>Panel debate</h3>
              <div className="debate-feed">
                {report.debate.turns.map((t, i) => {
                  const meta = AGENT_META[t.speaker]
                  const respondingMeta = t.respondingTo ? AGENT_META[t.respondingTo] : null
                  return (
                    <div className="quote" key={i}>
                      <div className={`mini-dot ${meta.color}`} />
                      <div>
                        <b>{meta.label}{respondingMeta ? ` → responding to ${respondingMeta.label}` : ''}</b>
                        <p>"{t.message}"</p>
                      </div>
                      <span className="quote-time">{t.stance}</span>
                    </div>
                  )
                })}
                {report.debate.revisions.map((r, i) => {
                  const meta = AGENT_META[r.agent]
                  return (
                    <div className="revised" key={i}>
                      {meta.label} changed position: "{r.from}" → "{r.to}" (after {AGENT_META[r.triggeredBy].label}'s point — {r.reason})
                    </div>
                  )
                })}
                {report.debate.revisions.length === 0 && <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>No agent changed its stance during this debate.</p>}
              </div>
            </div>

            <div className="report-section">
              <h3>Candidate profile (extracted facts)</h3>
              <div className="opinion-card">
                <p><b>Skills claimed:</b> {report.profile.skillsClaimed.join(', ') || '—'}</p>
                <p><b>Experience:</b> {report.profile.yearsExperience}</p>
                {report.profile.keyClaims.map((c, i) => (
                  <div className="ev" key={i}><b>{c.claim}</b> — "{c.quote}" ({c.source})</div>
                ))}
                {report.profile.notes && <p style={{ marginTop: 10 }}><b>Gaps noted:</b> {report.profile.notes}</p>}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}

function Dashboard() {
  const [evaluation, setEvaluation] = useState(false)
  return (
    <div className="app-shell">
      <Header onStart={() => setEvaluation(true)} />
      {evaluation ? <Evaluation onBack={() => setEvaluation(false)} /> : <Landing onStart={() => setEvaluation(true)} />}
    </div>
  )
}

export default function Page() { return <Dashboard /> }
