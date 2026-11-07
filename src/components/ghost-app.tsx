"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowDownToLine, AudioLines, Check, ChevronDown, CircleHelp, Copy, FileText, Mic, Pause, Play, Plus, Radio, Settings2, ShieldCheck, Sparkles, Square, Trash2, Volume2, X } from "lucide-react";
import type { MeetingResult, VoiceStyle } from "@/types/meeting";
import { safeFilename } from "@/lib/format";
const STORE = "ghost-voice-meetings-v1";
const STYLE_STORE = "ghost-voice-style-v1";
const styleNames: Record<VoiceStyle, string> = { direct: "Direct", warm: "Warm", executive: "Executive", casual: "Casual" };
export default function GhostApp() {
  const [meetings, setMeetings] = useState<MeetingResult[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [active, setActive] = useState<MeetingResult | null>(null);
  const [title, setTitle] = useState("Client catch-up");
  const [style, setStyle] = useState<VoiceStyle>("direct");
  const [status, setStatus] = useState<"idle" | "recording" | "processing" | "error">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [notice, setNotice] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => { try { const saved = localStorage.getItem(STORE); if (saved) setMeetings(JSON.parse(saved) as MeetingResult[]); const savedStyle = localStorage.getItem(STYLE_STORE); if (savedStyle === "direct" || savedStyle === "warm" || savedStyle === "executive" || savedStyle === "casual") setStyle(savedStyle); } catch { setNotice("Saved preferences or meeting history could not be read."); } finally { setHydrated(true); } }, []);
  useEffect(() => { if (!hydrated) return; try { localStorage.setItem(STYLE_STORE, style); } catch { setNotice("Your writing preference could not be saved in this browser."); } }, [style, hydrated]);
  useEffect(() => { if (!hydrated) return; try { localStorage.setItem(STORE, JSON.stringify(meetings)); } catch { setNotice("Browser storage is full. Export or delete older meetings."); } }, [meetings, hydrated]);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); stream.current?.getTracks().forEach((track) => track.stop()); window.speechSynthesis?.cancel(); }, []);
  const formatTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  async function startRecording() {
    setError(""); setNotice("");
    if (!navigator.mediaDevices?.getDisplayMedia) { setError("This browser cannot capture a shared tab. Try the latest Chrome or paste a transcript instead."); return; }
    try {
      const capture = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const audioTracks = capture.getAudioTracks();
      if (!audioTracks.length) { capture.getTracks().forEach((track) => track.stop()); setError("No shared audio detected. In the sharing dialog, select the meeting tab and enable 'Share tab audio'."); return; }
      const audioStream = new MediaStream(audioTracks);
      stream.current = capture;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const mediaRecorder = new MediaRecorder(audioStream, { mimeType: mime });
      chunks.current = [];
      mediaRecorder.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data); };
      mediaRecorder.onstop = async () => { capture.getTracks().forEach((track) => track.stop()); stream.current = null; if (timer.current) clearInterval(timer.current); await processAudio(new Blob(chunks.current, { type: mime })); };
      capture.getVideoTracks()[0]!.addEventListener("ended", () => { if (mediaRecorder.state !== "inactive") mediaRecorder.stop(); });
      mediaRecorder.start(1000); recorder.current = mediaRecorder; startedAt.current = Date.now(); setElapsed(0); setStatus("recording");
      timer.current = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);
    } catch (err) { const message = err instanceof Error ? err.message : "Screen sharing was cancelled."; setError(message.includes("Permission") ? "Screen and audio sharing permission is required to record." : "Capture was cancelled or unavailable. You can paste a transcript instead."); }
  }
  async function stopRecording() { if (recorder.current && recorder.current.state !== "inactive") { setStatus("processing"); recorder.current.stop(); } }
  async function processAudio(blob: Blob) {
    if (blob.size > 24 * 1024 * 1024) { setStatus("error"); setError("This recording is over 24 MB. Use a shorter meeting or paste a transcript."); return; }
    setStatus("processing");
    try {
      const form = new FormData(); form.append("audio", blob, "ghost-meeting.webm");
      const response = await fetch("/api/transcribe", { method: "POST", body: form });
      const result = await response.json() as { transcript?: string; error?: string };
      if (!response.ok || !result.transcript) throw new Error(result.error || "Transcription failed.");
      setTranscript(result.transcript); await analyze(result.transcript);
    } catch (err) { setStatus("error"); setError(err instanceof Error ? err.message : "Could not process recording."); }
  }
  async function analyze(text: string) {
    setStatus("processing"); setError("");
    try {
      const response = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transcript: text, style, title }) });
      const result = await response.json() as MeetingResult & { error?: string };
      if (!response.ok) throw new Error(result.error || "Analysis failed.");
      setActive(result); setMeetings((old) => [result, ...old.filter((item) => item.createdAt !== result.createdAt)]); setStatus("idle"); setNotice("Meeting captured. Here's what matters."); speak(result.spokenSummary);
    } catch (err) { setStatus("error"); setError(err instanceof Error ? err.message : "Analysis failed."); }
  }
  function speak(text: string) { if (!window.speechSynthesis) { setNotice("Speech playback isn't available in this browser. Read the summary below."); return; } window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.rate = 1.02; utterance.onstart = () => setPlaying(true); utterance.onend = () => setPlaying(false); utterance.onerror = () => setPlaying(false); window.speechSynthesis.speak(utterance); }
  function stopSpeech() { window.speechSynthesis?.cancel(); setPlaying(false); }
  function exportMeeting(item: MeetingResult) { const blob = new Blob([`# ${item.title}\n\n${new Date(item.createdAt).toLocaleString()}\n\n## Summary\n${item.summary}\n\n## Decisions\n${item.decisions.map((d) => `- ${d}`).join("\n")}\n\n## Action items\n${item.actionItems.map((a) => `- [ ] ${a.task} | Owner: ${a.owner} | Due: ${a.due}`).join("\n")}\n\n## Follow-up draft\n${item.followUp}\n\n## Transcript\n${item.transcript}`], { type: "text/markdown" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${safeFilename(item.title)}.md`; a.click(); URL.revokeObjectURL(url); }
  async function copy(text: string) { await navigator.clipboard.writeText(text); setNotice("Copied to clipboard."); }
  function removeMeeting(item: MeetingResult) { setMeetings((old) => old.filter((m) => m.createdAt !== item.createdAt)); if (active?.createdAt === item.createdAt) setActive(null); setNotice("Meeting deleted from this browser."); }
  const busy = status === "recording" || status === "processing";
  return <main className="shell">
    <header className="topbar"><a className="brand" href="#top" aria-label="Ghost home"><span className="brand-mark"><AudioLines size={19}/></span><span>G.H.O.S.T.<small>MEETING INTELLIGENCE</small></span></a><div className="top-actions"><span className="privacy"><ShieldCheck size={14}/> Local meeting history</span><button className="icon-button" onClick={() => setSettingsOpen(!settingsOpen)} aria-label="Open preferences"><Settings2 size={18}/></button></div></header>
    {settingsOpen && <section className="settings-panel"><div className="settings-head"><b>Your voice</b><button className="icon-button" onClick={() => setSettingsOpen(false)} aria-label="Close preferences"><X size={16}/></button></div><label htmlFor="voice-style">Follow-up writing style</label><select id="voice-style" value={style} onChange={(e) => setStyle(e.target.value as VoiceStyle)}>{Object.entries(styleNames).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select><p>This shapes the follow-up draft. It does not clone your voice or train on your messages.</p></section>}
    <section className="hero" id="top"><div className="eyebrow"><span className="live-dot"/> THE MEETING ENDS. THE WORK DOESN'T GET LOST.</div><h1>Your meetings leave.<br/><em>Their decisions don’t.</em></h1><p className="hero-copy">G.H.O.S.T. listens with permission, finds what matters, then tells you what happened and what comes next. In a voice that sounds like you.</p><div className="hero-meta"><span><ShieldCheck size={15}/> Recording only with your permission</span><span><AudioLines size={15}/> Spoken 60-second recap</span><span><FileText size={15}/> Decisions + actions + follow-up</span></div></section>
    <section className="workspace"><div className="capture-panel"><div className="section-kicker">01 / CAPTURE</div><div className="capture-title"><div><h2>Start a meeting ghost</h2><p>Share the meeting tab. G.H.O.S.T. handles the rest.</p></div><span className={`status-tag ${status}`}>{status === "recording" ? "RECORDING" : status === "processing" ? "THINKING" : status === "error" ? "NEEDS ATTENTION" : "STANDING BY"}</span></div><label className="field-label" htmlFor="meeting-title">Meeting name</label><input id="meeting-title" className="text-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g. Weekly project review" disabled={busy}/><div className={`record-visual ${status}`}><div className="orb"><AudioLines size={34}/></div><div className="record-time">{formatTime(elapsed)}</div><div className="record-caption">{status === "recording" ? "I'm listening. Keep your meeting window open." : status === "processing" ? "Turning conversation into clear next steps…" : "Ready when you are."}</div><div className="wave" aria-hidden="true">{Array.from({ length: 34 }, (_, i) => <i key={i} style={{ height: `${8 + ((i * 17 + 11) % 29)}px` }}/>)}</div></div>
    {status === "recording" ? <button className="primary-button stop-button" onClick={stopRecording}><Square size={16} fill="currentColor"/> End meeting & make my brief</button> : <button className="primary-button" onClick={startRecording} disabled={busy}><Radio size={17}/>{status === "processing" ? "Processing meeting…" : "Share meeting tab & start"}</button>}
    <div className="capture-note"><CircleHelp size={15}/><span>In the browser prompt, choose your meeting tab and turn on <b>Share tab audio</b>. A visible browser sharing indicator stays on while recording.</span></div>
    <div className="or-divider"><span>OR</span></div><button className="text-action" onClick={() => setManualOpen(!manualOpen)}><Plus size={15}/> Paste a transcript instead <ChevronDown size={14} className={manualOpen ? "rotated" : ""}/></button>
    {manualOpen && <div className="manual-entry"><label htmlFor="manual-transcript">Meeting transcript</label><textarea id="manual-transcript" value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="Paste a transcript from your meeting platform…" rows={6}/><button className="secondary-button" disabled={status === "processing" || transcript.trim().length < 30} onClick={() => analyze(transcript)}>Create my meeting brief <ArrowDownToLine size={15}/></button></div>}
    {error && <div className="error-box" role="alert"><X size={16}/><span>{error}</span></div>}
    </div>
    <div className="results-panel"><div className="section-kicker">02 / THE AFTERMATH</div><div className="results-heading"><div><h2>What matters now.</h2><p>Your meeting, minus the mental replay.</p></div><span className="result-count">{meetings.length} SAVED</span></div>
    {active ? <div className="brief"><div className="brief-top"><div><span className="brief-label">MEETING BRIEF</span><h3>{active.title}</h3><p className="brief-date">{new Date(active.createdAt).toLocaleString()}</p></div><button className="icon-button" aria-label="Export meeting brief" onClick={() => exportMeeting(active)}><ArrowDownToLine size={17}/></button></div><div className="spoken-card"><div className="spoken-head"><span><Volume2 size={15}/> THE 60-SECOND VERSION</span><button onClick={() => playing ? stopSpeech() : speak(active.spokenSummary)} aria-label={playing ? "Stop spoken summary" : "Play spoken summary"}>{playing ? <Pause size={16}/> : <Play size={16}/>}</button></div><p>{active.summary}</p><div className="spoken-footer"><span>{playing ? "SPEAKING NOW" : "READY TO PLAY"}</span><span>~ 60 SEC</span></div></div><div className="brief-section"><h4><Check size={15}/> Decisions</h4>{active.decisions.length ? <ul>{active.decisions.map((d, i) => <li key={i}>{d}</li>)}</ul> : <p className="muted">No firm decisions identified.</p>}</div><div className="brief-section"><h4><ArrowDownToLine size={15}/> Your action items</h4>{active.actionItems.length ? <ul className="actions-list">{active.actionItems.map((a, i) => <li key={i}><span>{a.task}</span><small>{a.owner} · {a.due}</small></li>)}</ul> : <p className="muted">No clear action items identified.</p>}</div><div className="brief-section followup"><div className="follow-head"><h4><FileText size={15}/> Follow-up, in your voice</h4><button className="mini-action" onClick={() => copy(active.followUp)}><Copy size={13}/> Copy</button></div><p>{active.followUp}</p></div><div className="brief-foot"><button className="text-action" onClick={() => setActive(null)}>Close brief</button><button className="text-action danger-action" onClick={() => removeMeeting(active)}><Trash2 size={14}/> Delete</button></div></div> : <div className="empty-state"><div className="empty-icon"><AudioLines size={26}/></div><h3>No loose ends. Yet.</h3><p>After your first meeting, your summary, decisions and follow-up draft will land here.</p><span>YOUR NEXT STEP IS ON THE LEFT <span>↖</span></span></div>}
    {meetings.length > 0 && <div className="history"><div className="history-head">RECENT MEETINGS <span>{meetings.length}</span></div>{meetings.slice(0, 5).map((m) => <button className={`history-row ${active?.createdAt === m.createdAt ? "selected" : ""}`} key={m.createdAt} onClick={() => setActive(m)}><span className="history-icon"><FileText size={15}/></span><span className="history-name"><b>{m.title}</b><small>{new Date(m.createdAt).toLocaleDateString()} · {m.actionItems.length} actions</small></span><ChevronDown size={15} className="history-arrow"/></button>)}</div>}
    </div></section>
    <footer className="footer"><div className="footer-brand">G.H.O.S.T. <span>DON'T LET THE IMPORTANT PART DISAPPEAR.</span></div><p>Use only with everyone’s knowledge and consent. You are responsible for complying with local recording laws and workplace policies.</p><span className="version">EARLY ACCESS BUILD · 01</span></footer>
    {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss notification"><X size={14}/></button></div>}
  </main>;
}
