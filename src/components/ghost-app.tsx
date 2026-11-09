
"use client";

import Image from "next/image";
import ghostLogo from "../../Ghogo.jpg";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  AudioLines,
  Check,
  ChevronDown,
  CircleHelp,
  Copy,
  FileText,
  Mic,
  Pause,
  Play,
  Plus,
  Radio,
  ShieldCheck,
  Square,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import type { MeetingResult, VoiceStyle } from "@/types/meeting";
import { isMeetingResult } from "@/types/meeting";
import { makeSpokenSummary, safeFilename } from "@/lib/format";
import {
  getApiError,
  isAnalysisPayload,
  type AnalysisPayload,
} from "@/lib/analysis-response";
import {
  loadMeetingHistory,
  serializeMeetingHistory,
} from "@/lib/meeting-storage";
import {
  getAudioFileExtension,
  MAX_AUDIO_SIZE,
} from "@/lib/audio";

const STORE = "ghost-voice-meetings-v1";
const MAX_TRANSCRIPT_LENGTH = 120_000;

type CaptureMode = "microphone" | "tab";
type Status = "idle" | "recording" | "paused" | "processing" | "error";

const styleNames: Record<VoiceStyle, string> = {
  direct: "Direct",
  warm: "Warm",
  executive: "Executive",
  casual: "Casual",
};

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error("The server returned an unreadable response.");
  }
}

export default function GhostApp() {
  const [meetings, setMeetings] = useState<MeetingResult[]>([]);
  const [active, setActive] = useState<MeetingResult | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const [title, setTitle] = useState("Quick conversation");
  const [style, setStyle] = useState<VoiceStyle>("direct");
  const [mode, setMode] = useState<CaptureMode>("microphone");
  const [status, setStatus] = useState<Status>("idle");

  const [transcript, setTranscript] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [playing, setPlaying] = useState(false);

  const recorder = useRef<MediaRecorder | null>(null);
  const captureStream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const exceededSize = useRef(false);
  const recordingFailed = useRef(false);

  const busy = status === "processing";
  const recording = status === "recording" || status === "paused";

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE);
      const loaded = loadMeetingHistory(saved);

      setMeetings(loaded);

      if (saved) {
        try {
          const parsed: unknown = JSON.parse(saved);

          if (
            !Array.isArray(parsed) ||
            parsed.length !== loaded.length
          ) {
            setNotice(
              "Some invalid saved records were skipped. Your valid history was retained."
            );
          }
        } catch {
          setNotice(
            "Saved meeting history was damaged and could not be loaded."
          );
        }
      }
    } catch {
      setNotice("Saved meeting history could not be loaded.");
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    try {
      localStorage.setItem(
        STORE,
        serializeMeetingHistory(meetings)
      );
    } catch {
      setNotice(
        "Browser storage is full. Export or delete older meetings."
      );
    }
  }, [meetings, hydrated]);

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);

      if (recorder.current && recorder.current.state !== "inactive") {
        recorder.current.onstop = null;
        recorder.current.stop();
      }

      captureStream.current
        ?.getTracks()
        .forEach((track) => track.stop());

      window.speechSynthesis?.cancel();
    };
  }, []);

  function stopTimer() {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }

  function startTimer() {
    stopTimer();

    timer.current = setInterval(() => {
      setElapsed((value) => value + 1);
    }, 1000);
  }

  function formatTime(seconds: number) {
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
      seconds % 60
    ).padStart(2, "0")}`;
  }

  async function startRecording() {
    setError("");
    setNotice("");

    if (!consent) {
      setError(
        "Confirm that everyone involved knows recording is taking place."
      );
      return;
    }

    if (!window.isSecureContext) {
      setError(
        "Microphone access requires a secure HTTPS connection."
      );
      return;
    }

    if (!navigator.mediaDevices || !window.MediaRecorder) {
      setError(
        "Recording is unavailable in this browser. Use transcript import."
      );
      return;
    }

    let stream: MediaStream | null = null;

    try {
      if (mode === "microphone") {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } else {
        if (!navigator.mediaDevices.getDisplayMedia) {
          throw new Error(
            "Tab audio capture is not supported by this browser."
          );
        }

        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
      }

      const audioTracks = stream.getAudioTracks();

      if (!audioTracks.length) {
        throw new Error(
          mode === "tab"
            ? "No tab audio received. Enable Share tab audio."
            : "The browser did not provide a microphone audio track."
        );
      }

      if (audioTracks.every((track) => track.readyState !== "live")) {
        throw new Error(
          "The audio input is no longer active. Check your microphone and try again."
        );
      }

      const audioStream = new MediaStream(audioTracks);

      const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
      ];

      const mime = candidates.find((item) =>
        MediaRecorder.isTypeSupported(item)
      );

      const mediaRecorder = new MediaRecorder(
        audioStream,
        mime ? { mimeType: mime } : undefined
      );

      captureStream.current = stream;
      recorder.current = mediaRecorder;
      chunks.current = [];
      exceededSize.current = false;
      recordingFailed.current = false;

      mediaRecorder.ondataavailable = (event) => {
        if (!event.data.size) return;

        chunks.current.push(event.data);

        const total = chunks.current.reduce(
          (sum, chunk) => sum + chunk.size,
          0
        );

        if (total > MAX_AUDIO_SIZE) {
          exceededSize.current = true;
          setError("Recording reached the 4 MB upload limit.");

          if (mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
          }
        }
      };

      mediaRecorder.onerror = () => {
        recordingFailed.current = true;
        stopTimer();
        setStatus("error");
        setError(
          "The browser encountered a recording error. Check microphone access and try again."
        );
      };

      mediaRecorder.onstop = async () => {
        stopTimer();

        stream?.getTracks().forEach((track) => track.stop());
        captureStream.current = null;
        recorder.current = null;

        if (recordingFailed.current) {
          chunks.current = [];
          setStatus("error");
          return;
        }

        if (exceededSize.current) {
          chunks.current = [];
          setStatus("error");
          setError(
            "The recording exceeded the 4 MB upload limit. Record a shorter segment."
          );
          return;
        }

        const blob = new Blob(chunks.current, {
          type: mediaRecorder.mimeType || mime || "audio/webm",
        });

        chunks.current = [];

        if (blob.size < 1000) {
          setStatus("error");
          setError(
            "No usable audio was captured. Check your microphone input and record again."
          );
          return;
        }

        await processAudio(blob);
      };

      if (mode === "tab") {
        stream.getVideoTracks()[0]?.addEventListener("ended", () => {
          if (mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
          }
        });
      }

      mediaRecorder.start(1000);

      setElapsed(0);
      setStatus("recording");
      startTimer();
      setNotice("Recording started.");
    } catch (err) {
      stream?.getTracks().forEach((track) => track.stop());
      captureStream.current = null;
      recorder.current = null;
      setStatus("error");

      setError(
        err instanceof Error
          ? err.message
          : "Recording could not be started."
      );
    }
  }

  function pauseRecording() {
    if (recorder.current?.state === "recording") {
      recorder.current.pause();
      stopTimer();
      setStatus("paused");
      setNotice("Recording paused.");
    }
  }

  function resumeRecording() {
    if (recorder.current?.state === "paused") {
      recorder.current.resume();
      startTimer();
      setStatus("recording");
      setNotice("Recording resumed.");
    }
  }

  function stopRecording() {
    if (recorder.current && recorder.current.state !== "inactive") {
      stopTimer();
      setStatus("processing");
      recorder.current.stop();
    }
  }

  async function processAudio(blob: Blob) {
    if (blob.size < 1000 || blob.size > MAX_AUDIO_SIZE) {
      setStatus("error");
      setError(
        "The recording is empty or exceeds the 4 MB upload limit."
      );
      return;
    }

    setStatus("processing");
    setError("");
    setNotice("Transcribing your conversation...");

    try {
      const extension = getAudioFileExtension(blob.type);
      const form = new FormData();

      form.append(
        "audio",
        blob,
        `ghost-recording.${extension}`
      );

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: form,
        cache: "no-store",
      });

      const result = await readJson(response);

      if (
        !response.ok ||
        !result ||
        typeof result !== "object" ||
        !("transcript" in result) ||
        typeof result.transcript !== "string" ||
        !result.transcript.trim()
      ) {
        throw new Error(
          getApiError(result, "Transcription failed.")
        );
      }

      setTranscript(result.transcript);
      setManualOpen(true);
      setStatus("idle");
      setNotice(
        "Transcript ready. Review it before creating your Blueprint."
      );
    } catch (err) {
      setStatus("error");

      setError(
        err instanceof Error
          ? err.message
          : "The recording could not be processed."
      );
    }
  }

  async function analyze(text: string) {
    const cleanTranscript = text.trim();

    if (cleanTranscript.length < 30) {
      setStatus("error");
      setError(
        "Add a longer transcript before creating a Blueprint."
      );
      return;
    }

    if (cleanTranscript.length > MAX_TRANSCRIPT_LENGTH) {
      setStatus("error");
      setError(
        "This transcript is too long. Shorten it to 120,000 characters or fewer."
      );
      return;
    }

    setStatus("processing");
    setError("");
    setNotice("Starting your meeting analysis...");

    try {
      const startResponse = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          transcript: cleanTranscript,
          style,
          title: title.trim() || "Untitled meeting",
        }),
      });

      const startResult = await readJson(startResponse);

      if (
        !startResponse.ok ||
        !startResult ||
        typeof startResult !== "object" ||
        !("interactionId" in startResult) ||
        typeof startResult.interactionId !== "string" ||
        !startResult.interactionId
      ) {
        throw new Error(
          getApiError(
            startResult,
            "G.H.O.S.T. could not start the analysis."
          )
        );
      }

      const interactionId = startResult.interactionId;
      let analysis: AnalysisPayload | null = null;
      const maxAttempts = 120;

      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        await new Promise((resolve) =>
          window.setTimeout(resolve, 2000)
        );

        const pollResponse = await fetch(
          `/api/analyze?id=${encodeURIComponent(interactionId)}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const pollResult = await readJson(pollResponse);

        if (!pollResponse.ok) {
          throw new Error(
            getApiError(
              pollResult,
              "G.H.O.S.T. could not retrieve the analysis."
            )
          );
        }

        if (
          !pollResult ||
          typeof pollResult !== "object" ||
          !("status" in pollResult) ||
          typeof pollResult.status !== "string"
        ) {
          throw new Error(
            "The analysis service returned an invalid status."
          );
        }

        if (pollResult.status === "failed") {
          throw new Error(
            getApiError(
              pollResult,
              "G.H.O.S.T. could not complete the analysis."
            )
          );
        }

        if (pollResult.status === "completed") {
          if (
            !("analysis" in pollResult) ||
            !isAnalysisPayload(pollResult.analysis)
          ) {
            throw new Error(
              "The analysis service returned an incomplete Blueprint."
            );
          }

          analysis = pollResult.analysis;
          break;
        }

        if (pollResult.status !== "processing") {
          throw new Error(
            "The analysis service returned an unknown status."
          );
        }

        if (attempt > 0 && attempt % 10 === 0) {
          setNotice("Analysis is still running...");
        }
      }

      if (!analysis) {
        throw new Error(
          "Analysis timed out. Your transcript is still available. Please retry."
        );
      }

      const result: MeetingResult = {
        title: title.trim() || "Untitled meeting",
        summary: analysis.summary,
        objective: analysis.objective,
        friction: analysis.friction,
        alignment: analysis.alignment,
        spokenSummary: "",
        decisions: analysis.decisions,
        actionItems: analysis.actionItems,
        efficiencyMeter: analysis.efficiencyMeter,
        executiveFollowUp: analysis.executiveFollowUp,
        clientFollowUp: analysis.clientFollowUp,
        teamFollowUp: analysis.teamFollowUp,
        followUp: analysis.clientFollowUp.body,
        transcript: cleanTranscript,
        createdAt: new Date().toISOString(),
      };

      result.spokenSummary = makeSpokenSummary(result);

      if (!isMeetingResult(result)) {
        throw new Error(
          "The generated Blueprint did not pass validation."
        );
      }

      setActive(result);
      setMeetings((previous) => [result, ...previous]);

      // Clear the capture workspace only after the Blueprint is valid.
      setTranscript("");
      setManualOpen(false);
      setElapsed(0);
      setTitle("Quick conversation");
      setConsent(false);

      setStatus("idle");
      setError("");
      setNotice("Your meeting Blueprint is ready.");

      if (result.spokenSummary) {
        speak(result.spokenSummary);
      }
    } catch (err) {
      setStatus("error");

      setError(
        err instanceof Error
          ? err.message
          : "Meeting analysis failed. Your transcript is still available."
      );
    }
  }

  function speak(text: string) {
    if (!window.speechSynthesis) {
      setNotice(
        "Speech playback is unavailable in this browser."
      );
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.02;
    utterance.onstart = () => setPlaying(true);
    utterance.onend = () => setPlaying(false);
    utterance.onerror = () => setPlaying(false);

    window.speechSynthesis.speak(utterance);
  }

  function stopSpeech() {
    window.speechSynthesis?.cancel();
    setPlaying(false);
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Copied to clipboard.");
    } catch {
      setNotice("Clipboard access was blocked by your browser.");
    }
  }

  function exportMeeting(
    item: MeetingResult,
    includeTranscript = false
  ) {
    const lines = [
      "# G.H.O.S.T. Meeting Blueprint",
      "",
      `# ${item.title}`,
      "",
      new Date(item.createdAt).toLocaleString(),
      "",
      "## Meeting Summary",
      item.summary,
      "",
      "## Objective",
      item.objective,
      "",
      "## Friction",
      item.friction,
      "",
      "## Alignment",
      item.alignment,
      "",
      "## Confirmed Decisions",
      ...(item.decisions.length
        ? item.decisions.map((decision) => `- ${decision}`)
        : ["- No confirmed decisions identified."]),
      "",
      "## Action Items",
      ...(item.actionItems.length
        ? item.actionItems.map(
            (action) =>
              `- [ ] ${action.task} | Owner: ${action.owner} | Due: ${action.due}`
          )
        : ["- No clear action items identified."]),
      "",
      "## Efficiency Meter",
      `- Transcript volume: ${item.efficiencyMeter.meetingVolume}`,
      `- Estimated actionable velocity: ${item.efficiencyMeter.actionableVelocityPercent}%`,
      `- Estimated non-actionable content: ${item.efficiencyMeter.corporateNoiseFilteredPercent}%`,
      item.efficiencyMeter.methodology,
      "",
      "## Executive Blueprint",
      `Subject: ${item.executiveFollowUp.subject}`,
      item.executiveFollowUp.body,
      "",
      "## Client-Facing Delight",
      `Subject: ${item.clientFollowUp.subject}`,
      item.clientFollowUp.body,
      "",
      "## Team-Hustle Pulse",
      `Subject: ${item.teamFollowUp.subject}`,
      item.teamFollowUp.body,
    ];

    if (includeTranscript) {
      lines.push(
        "",
        "---",
        "",
        "## Original Transcript",
        "",
        item.transcript
      );
    }

    const blob = new Blob([lines.join("\n")], {
      type: "text/markdown;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${safeFilename(item.title)}${
      includeTranscript ? "-with-transcript" : ""
    }.md`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function removeMeeting(item: MeetingResult) {
    setMeetings((previous) =>
      previous.filter(
        (meeting) => meeting.createdAt !== item.createdAt
      )
    );

    if (active?.createdAt === item.createdAt) {
      setActive(null);
    }

    setNotice("Meeting deleted from this browser.");
  }

  const statusLabel =
    status === "recording"
      ? "RECORDING"
      : status === "paused"
        ? "PAUSED"
        : status === "processing"
          ? "PROCESSING"
          : status === "error"
            ? "NEEDS ATTENTION"
            : "STANDING BY";

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="G.H.O.S.T. home">
          <span className="brand-mark">
            <Image
              src={ghostLogo}
              alt="G.H.O.S.T. logo"
              width={34}
              height={34}
              priority
              style={{
                width: 34,
                height: 34,
                objectFit: "contain",
              }}
            />
          </span>
          <span>
            G.H.O.S.T.
            <small>MEETING INTELLIGENCE</small>
          </span>
        </a>

        <div className="top-actions">
          <span className="privacy">
            <ShieldCheck size={14} />
            Browser-local history
          </span>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="eyebrow">
          <span className="live-dot" />
          THE MEETING ENDS. THE WORK DOESN&apos;T GET LOST.
        </div>

        <h1>
          Your meetings leave.
          <br />
          <em>Their decisions don’t.</em>
        </h1>

        <p className="hero-copy">
          Turn a recorded conversation or transcript into a clear Meeting
          Blueprint: decisions, action items, owners and follow-ups.
        </p>

        <div className="hero-meta">
          <span><Check size={14} /> Permission-based capture</span>
          <span><Check size={14} /> Structured decisions</span>
          <span><Check size={14} /> Ready-to-use follow-ups</span>
        </div>
      </section>

      <section className="workspace">
        <div className="capture-panel">
          <div className="section-kicker">
            01 / CAPTURE THE CONVERSATION
          </div>

          <label className="field-label" htmlFor="meeting-title">
            Meeting title
          </label>
          <input
            id="meeting-title"
            className="text-input"
            value={title}
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
          />

          <label className="field-label" htmlFor="writing-style">
            Follow-up writing style
          </label>
          <select
            id="writing-style"
            className="text-input"
            value={style}
            onChange={(event) =>
              setStyle(event.target.value as VoiceStyle)
            }
          >
            {Object.entries(styleNames).map(([key, value]) => (
              <option key={key} value={key}>
                {value}
              </option>
            ))}
          </select>

          <div className="capture-title">
            Choose your recording source
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="secondary-button"
              style={{ flex: 1, marginTop: 0 }}
              disabled={recording || busy}
              onClick={() => setMode("microphone")}
            >
              <Mic size={15} /> Microphone
            </button>

            <button
              className="secondary-button"
              style={{ flex: 1, marginTop: 0 }}
              disabled={recording || busy}
              onClick={() => setMode("tab")}
            >
              <Radio size={15} /> Meeting tab
            </button>
          </div>

          <div className={`record-visual ${status}`}>
            <AudioLines size={34} />
            <div className="record-time">
              {formatTime(elapsed)}
            </div>
            <div className="record-caption">{statusLabel}</div>
          </div>

          <label className="capture-note">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            />
            <span>
              I confirm that everyone involved knows recording is taking
              place and that I have obtained any required consent.
            </span>
          </label>

          <div className="capture-note">
            <ShieldCheck size={15} />
            <span>
              Audio and transcripts are sent to Google Gemini for
              processing. Do not submit confidential conversations unless
              you have permission and have reviewed the provider&apos;s
              data terms.
            </span>
          </div>

          {recording ? (
            <div style={{ display: "flex", gap: 9 }}>
              {status === "recording" ? (
                <button
                  className="secondary-button"
                  style={{ flex: 1, marginTop: 0 }}
                  onClick={pauseRecording}
                >
                  <Pause size={15} /> Pause
                </button>
              ) : (
                <button
                  className="secondary-button"
                  style={{ flex: 1, marginTop: 0 }}
                  onClick={resumeRecording}
                >
                  <Play size={15} /> Resume
                </button>
              )}

              <button
                className="primary-button stop-button"
                style={{ flex: 1 }}
                onClick={stopRecording}
              >
                <Square size={15} /> Finish
              </button>
            </div>
          ) : (
            <button
              className="primary-button"
              onClick={startRecording}
              disabled={busy || !consent}
            >
              {mode === "microphone" ? (
                <Mic size={17} />
              ) : (
                <Radio size={17} />
              )}
              {busy ? "Processing conversation..." : "Start recording"}
            </button>
          )}

          <div className="capture-note">
            <CircleHelp size={15} />
            <span>
              Tab capture requires a supported browser and the Share tab
              audio permission. G.H.O.S.T. does not directly intercept
              cellular calls.
            </span>
          </div>

          <div className="or-divider"><span>OR</span></div>

          <button
            className="text-action"
            onClick={() => setManualOpen((value) => !value)}
          >
            <Plus size={15} />
            Import a transcript instead
            <ChevronDown size={14} />
          </button>

          {manualOpen && (
            <div className="manual-entry">
              <label htmlFor="manual-transcript">
                Review or edit your transcript
              </label>
              <textarea
                id="manual-transcript"
                value={transcript}
                onChange={(event) => setTranscript(event.target.value)}
                placeholder="Paste your meeting transcript here..."
                rows={8}
                maxLength={MAX_TRANSCRIPT_LENGTH}
              />
              <button
                className="secondary-button"
                disabled={
                  busy || transcript.trim().length < 30
                }
                onClick={() => analyze(transcript)}
              >
                Create my Meeting Blueprint
                <ArrowDownToLine size={15} />
              </button>
            </div>
          )}

          {error && (
            <div className="error-box" role="alert">
              <X size={16} />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="results-panel">
          <div className="section-kicker">02 / THE AFTERMATH</div>

          <div className="results-heading">
            <div>
              <h2>What matters now.</h2>
              <p>Your conversation, minus the mental replay.</p>
            </div>
            <span className="result-count">
              {meetings.length} SAVED
            </span>
          </div>

          {active ? (
            <div className="brief">
              <div className="brief-top">
                <div>
                  <span className="brief-label">
                    G.H.O.S.T. MEETING BLUEPRINT
                  </span>
                  <h3>{active.title}</h3>
                  <p className="brief-date">
                    {new Date(active.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="spoken-card">
                <div className="spoken-head">
                  <span>
                    <Volume2 size={15} /> THE SPOKEN SUMMARY
                  </span>
                  <button
                    onClick={() =>
                      playing
                        ? stopSpeech()
                        : speak(active.spokenSummary)
                    }
                    aria-label={
                      playing ? "Stop summary" : "Play summary"
                    }
                  >
                    {playing ? (
                      <Pause size={16} />
                    ) : (
                      <Play size={16} />
                    )}
                  </button>
                </div>

                <p>{active.summary}</p>

                <div className="spoken-footer">
                  <span>
                    {playing ? "SPEAKING NOW" : "READY TO PLAY"}
                  </span>
                  <span>G.H.O.S.T.</span>
                </div>
              </div>

              <div className="brief-section">
                <h4>MEETING OUTCOME</h4>
                <p>
                  <b>Objective</b>
                  <br />
                  {active.objective}
                </p>
                <p>
                  <b>Friction</b>
                  <br />
                  {active.friction}
                </p>
                <p>
                  <b>Alignment</b>
                  <br />
                  {active.alignment}
                </p>
              </div>

              <div className="brief-section">
                <h4>G.H.O.S.T. EFFICIENCY METER</h4>

                <div className="metrics-grid">
                  <div className="metric-card">
                    <strong className="metric-volume">
                      {active.efficiencyMeter.meetingVolume}
                    </strong>
                    <small>TRANSCRIPT VOLUME</small>
                  </div>

                  <div className="metric-card">
                    <strong>
                      {active.efficiencyMeter.actionableVelocityPercent}%
                    </strong>
                    <small>EST. ACTIONABLE VELOCITY</small>
                  </div>

                  <div className="metric-card">
                    <strong>
                      {active.efficiencyMeter.corporateNoiseFilteredPercent}%
                    </strong>
                    <small>EST. NON-ACTIONABLE</small>
                  </div>
                </div>

                <p className="muted metric-disclaimer">
                  Estimates based on transcript content, not measured
                  meeting time. These are directional indicators, not
                  audited metrics.
                </p>

                <p className="muted metric-method">
                  {active.efficiencyMeter.methodology}
                </p>
              </div>

              <div className="brief-section">
                <h4>
                  <Check size={15} /> CONFIRMED DECISIONS
                </h4>

                {active.decisions.length ? (
                  <ul>
                    {active.decisions.map((decision, index) => (
                      <li key={index}>{decision}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">
                    No confirmed decisions identified.
                  </p>
                )}
              </div>

              <div className="brief-section">
                <h4>
                  <ArrowDownToLine size={15} /> ACTION ITEMS
                </h4>

                {active.actionItems.length ? (
                  <ul className="actions-list">
                    {active.actionItems.map((action, index) => (
                      <li key={index}>
                        <span>{action.task}</span>
                        <small>
                          {action.owner} · {action.due}
                        </small>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">
                    No clear action items identified.
                  </p>
                )}
              </div>

              {([
                ["EXECUTIVE BLUEPRINT", active.executiveFollowUp],
                ["CLIENT-FACING DELIGHT", active.clientFollowUp],
                ["TEAM-HUSTLE PULSE", active.teamFollowUp],
              ] as const).map(([label, draft]) => (
                <div
                  className="brief-section followup"
                  key={label}
                >
                  <div className="follow-head">
                    <h4>
                      <FileText size={15} /> {label}
                    </h4>
                    <button
                      className="mini-action"
                      onClick={() =>
                        copy(
                          `Subject: ${draft.subject}\n\n${draft.body}`
                        )
                      }
                    >
                      <Copy size={13} /> Copy
                    </button>
                  </div>

                  <strong>{draft.subject}</strong>
                  <p>{draft.body}</p>
                </div>
              ))}

              <div className="brief-section">
                <div className="follow-head">
                  <h4>ORIGINAL TRANSCRIPT</h4>
                  <button
                    className="mini-action"
                    onClick={() => copy(active.transcript)}
                  >
                    <Copy size={13} /> Copy
                  </button>
                </div>

                <details>
                  <summary>Show original transcript</summary>
                  <p className="transcript-text">
                    {active.transcript}
                  </p>
                </details>
              </div>

              <div className="brief-section">
                <h4>EXPORT BLUEPRINT</h4>

                <div className="export-actions">
                  <button
                    className="secondary-button"
                    onClick={() => exportMeeting(active, false)}
                  >
                    <ArrowDownToLine size={15} />
                    Blueprint (.md)
                  </button>

                  <button
                    className="secondary-button"
                    onClick={() => exportMeeting(active, true)}
                  >
                    <ArrowDownToLine size={15} />
                    Blueprint + Transcript (.md)
                  </button>
                </div>
              </div>

              <div className="brief-foot">
                <button
                  className="text-action"
                  onClick={() => setActive(null)}
                >
                  Close brief
                </button>

                <button
                  className="text-action danger-action"
                  onClick={() => removeMeeting(active)}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                <AudioLines size={26} />
              </div>
              <h3>Nothing gets lost here.</h3>
              <p>
                Capture your next conversation. G.H.O.S.T. will organise
                the summary, decisions and follow-up here.
              </p>
              <span className="next-step-desktop">
                YOUR NEXT STEP IS ON THE LEFT ↖
              </span>
              <span className="next-step-mobile">
                YOUR NEXT STEP IS ABOVE ↑
              </span>
            </div>
          )}

          {meetings.length > 0 && (
            <div className="history">
              <div className="history-head">
                RECENT CONVERSATIONS
                <span>{meetings.length}</span>
              </div>

              {meetings.slice(0, 5).map((meeting) => (
                <button
                  className={`history-row ${
                    active?.createdAt === meeting.createdAt
                      ? "selected"
                      : ""
                  }`}
                  key={meeting.createdAt}
                  onClick={() => setActive(meeting)}
                >
                  <span className="history-icon">
                    <FileText size={15} />
                  </span>

                  <span className="history-name">
                    <b>{meeting.title}</b>
                    <small>
                      {new Date(
                        meeting.createdAt
                      ).toLocaleDateString()}
                      {" · "}
                      {meeting.actionItems.length} actions
                    </small>
                  </span>

                  <ChevronDown
                    size={15}
                    className="history-arrow"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="footer">
        <div className="footer-brand">
          G.H.O.S.T.
          <span>
            DON&apos;T LET THE IMPORTANT PART DISAPPEAR.
          </span>
        </div>

        <p>
          Record only with everyone&apos;s knowledge and consent.
          Recording laws and workplace policies vary. Verify
          AI-generated decisions and commitments before acting.
          Audio and transcript content are processed by Google Gemini.
        </p>

        <span className="version">EARLY ACCESS BUILD · 04</span>
      </footer>

      {notice && (
        <div className="toast" role="status">
          {notice}
          <button
            onClick={() => setNotice("")}
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <style jsx global>{`
        .next-step-mobile {
          display: none;
        }

        @media (max-width: 850px) {
          .next-step-desktop {
            display: none;
          }

          .next-step-mobile {
            display: inline;
          }
        }
      `}</style>
    </main>
  );
}
