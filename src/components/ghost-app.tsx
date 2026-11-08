
"use client";

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
  Settings2,
  ShieldCheck,
  Square,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import type { MeetingResult, VoiceStyle } from "@/types/meeting";
import { safeFilename } from "@/lib/format";

const STORE = "ghost-voice-meetings-v1";
const STYLE_STORE = "ghost-voice-style-v1";
const MAX_AUDIO_SIZE = 4 * 1024 * 1024;

type CaptureMode = "microphone" | "tab";
type RecordingStatus =
  | "idle"
  | "recording"
  | "paused"
  | "processing"
  | "error";

const styleNames: Record<VoiceStyle, string> = {
  direct: "Direct",
  warm: "Warm",
  executive: "Executive",
  casual: "Casual",
};

export default function GhostApp() {
  const [meetings, setMeetings] = useState<MeetingResult[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [active, setActive] = useState<MeetingResult | null>(null);

  const [title, setTitle] = useState("Quick conversation");
  const [style, setStyle] = useState<VoiceStyle>("direct");
  const [mode, setMode] = useState<CaptureMode>("microphone");
  const [status, setStatus] = useState<RecordingStatus>("idle");

  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [playing, setPlaying] = useState(false);

  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const exceededSize = useRef(false);

  const busy =
    status === "recording" ||
    status === "paused" ||
    status === "processing";

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE);

      if (saved) {
        setMeetings(JSON.parse(saved) as MeetingResult[]);
      }

      const savedStyle = localStorage.getItem(STYLE_STORE);

      if (
        savedStyle === "direct" ||
        savedStyle === "warm" ||
        savedStyle === "executive" ||
        savedStyle === "casual"
      ) {
        setStyle(savedStyle);
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
      localStorage.setItem(STORE, JSON.stringify(meetings));
    } catch {
      setNotice(
        "Browser storage is full. Export or delete older meetings."
      );
    }
  }, [meetings, hydrated]);

  useEffect(() => {
    if (!hydrated) return;

    try {
      localStorage.setItem(STYLE_STORE, style);
    } catch {
      setNotice("Your preferences could not be saved.");
    }
  }, [style, hydrated]);

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);

      if (recorder.current?.state !== "inactive") {
        recorder.current?.stop();
      }

      stream.current?.getTracks().forEach((track) => track.stop());
      window.speechSynthesis?.cancel();
    };
  }, []);

  function formatTime(seconds: number) {
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
      seconds % 60
    ).padStart(2, "0")}`;
  }

  function stopTimer() {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }

  function startTimer() {
    stopTimer();

    timer.current = setInterval(() => {
      setElapsed((previous) => previous + 1);
    }, 1000);
  }

  function getAudioMimeType() {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/mp4",
      "audio/webm",
    ];

    return candidates.find((type) =>
      MediaRecorder.isTypeSupported(type)
    ) || "";
  }

  async function startRecording() {
    setError("");
    setNotice("");

    if (!navigator.mediaDevices || !window.MediaRecorder) {
      setError(
        "Audio recording is not supported by this browser. Try the latest Chrome or use transcript import."
      );
      return;
    }

    let capture: MediaStream | null = null;

    try {
      if (mode === "microphone") {
        if (!navigator.mediaDevices.getUserMedia) {
          throw new Error(
            "Microphone recording is not supported by this browser."
          );
        }

        capture = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } else {
        if (!navigator.mediaDevices.getDisplayMedia) {
          throw new Error(
            "Tab recording is unavailable in this browser. Try microphone capture instead."
          );
        }

        capture = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });

        if (!capture.getAudioTracks().length) {
          capture.getTracks().forEach((track) => track.stop());
          capture = null;

          throw new Error(
            "No tab audio was received. Select your meeting tab and enable Share tab audio."
          );
        }
      }

      const audioTracks = capture.getAudioTracks();

      if (!audioTracks.length) {
        throw new Error("No microphone or audio input was detected.");
      }

      const audioStream = new MediaStream(audioTracks);
      const mime = getAudioMimeType();

      const mediaRecorder = new MediaRecorder(
        audioStream,
        mime ? { mimeType: mime } : undefined
      );

      stream.current = capture;
      chunks.current = [];
      exceededSize.current = false;

      mediaRecorder.ondataavailable = (event) => {
        if (!event.data.size) return;

        chunks.current.push(event.data);

        const currentSize = chunks.current.reduce(
          (total, chunk) => total + chunk.size,
          0
        );

        if (currentSize > MAX_AUDIO_SIZE) {
          exceededSize.current = true;

          setError(
            "The recording has reached the 4 MB upload limit. End the recording and use a shorter session."
          );

          if (mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
          }
        }
      };

      mediaRecorder.onerror = () => {
        setError("The browser encountered a recording error.");
        setStatus("error");
      };

      mediaRecorder.onstop = async () => {
        stopTimer();

        capture?.getTracks().forEach((track) => track.stop());

        stream.current = null;
        recorder.current = null;

        if (exceededSize.current) {
          setStatus("error");
          chunks.current = [];
          return;
        }

        const audioType =
          mediaRecorder.mimeType || mime || "audio/webm";

        const blob = new Blob(chunks.current, {
          type: audioType,
        });

        chunks.current = [];

        await processAudio(blob);
      };

      if (mode === "tab") {
        capture.getVideoTracks()[0]?.addEventListener(
          "ended",
          () => {
            if (mediaRecorder.state !== "inactive") {
              setStatus("processing");
              mediaRecorder.stop();
            }
          }
        );
      }

      recorder.current = mediaRecorder;

      mediaRecorder.start(1000);

      setElapsed(0);
      setStatus("recording");
      startTimer();

      setNotice(
        mode === "microphone"
          ? "Microphone active. G.H.O.S.T. is listening."
          : "Meeting audio capture started."
      );
    } catch (err) {
      capture?.getTracks().forEach((track) => track.stop());

      stream.current = null;

      const message =
        err instanceof Error
          ? err.message
          : "Recording could not be started.";

      setError(
        message.includes("NotAllowedError")
          ? "Permission was denied. Allow microphone or screen access in your browser settings."
          : message
      );

      setStatus("error");
    }
  }

  function pauseRecording() {
    if (
      recorder.current &&
      recorder.current.state === "recording"
    ) {
      recorder.current.pause();
      stopTimer();
      setStatus("paused");
      setNotice("Recording paused.");
    }
  }

  function resumeRecording() {
    if (
      recorder.current &&
      recorder.current.state === "paused"
    ) {
      recorder.current.resume();
      startTimer();
      setStatus("recording");
      setNotice("Recording resumed.");
    }
  }

  function stopRecording() {
    if (
      recorder.current &&
      recorder.current.state !== "inactive"
    ) {
      stopTimer();
      setStatus("processing");
      recorder.current.stop();
    }
  }

  async function processAudio(blob: Blob) {
    if (blob.size < 1000) {
      setStatus("error");
      setError(
        "The recording was empty or too short. Try recording again."
      );
      return;
    }

    if (blob.size > MAX_AUDIO_SIZE) {
      setStatus("error");
      setError(
        "This recording exceeds the 4 MB upload limit. Use a shorter recording."
      );
      return;
    }

    setStatus("processing");
    setError("");
    setNotice("Transcribing your conversation...");

    try {
      const extension = blob.type.includes("mp4")
        ? "mp4"
        : "webm";

      const form = new FormData();

      form.append(
        "audio",
        blob,
        `ghost-recording.${extension}`
      );

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: form,
      });

      const result = (await response.json()) as {
        transcript?: string;
        error?: string;
      };

      if (!response.ok || !result.transcript) {
        throw new Error(
          result.error || "Transcription failed."
        );
      }

      setTranscript(result.transcript);
      setManualOpen(true);
      setStatus("idle");
      setNotice(
        "Transcript ready. Review it before creating your brief."
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
    if (text.trim().length < 30) {
      setStatus("error");
      setError("Add a longer transcript before creating a brief.");
      return;
    }

    setStatus("processing");
    setError("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcript: text,
          style,
          title,
        }),
      });

      const result = (await response.json()) as MeetingResult & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          result.error || "Meeting analysis failed."
        );
      }

      setActive(result);

      setMeetings((previous) => [
        result,
        ...previous.filter(
          (item) => item.createdAt !== result.createdAt
        ),
      ]);

      setStatus("idle");
      setNotice("Your meeting brief is ready.");

      speak(result.spokenSummary);
    } catch (err) {
      setStatus("error");

      setError(
        err instanceof Error
          ? err.message
          : "Meeting analysis failed."
      );
    }
  }

  function speak(text: string) {
    if (!window.speechSynthesis) {
      setNotice(
        "Speech playback is unavailable. Read your brief below."
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

  function exportMeeting(item: MeetingResult) {
    const markdown = [
      `# ${item.title}`,
      "",
      new Date(item.createdAt).toLocaleString(),
      "",
      "## Summary",
      item.summary,
      "",
      "## Decisions",
      ...item.decisions.map((decision) => `- ${decision}`),
      "",
      "## Action items",
      ...item.actionItems.map(
        (action) =>
          `- [ ] ${action.task} | Owner: ${action.owner} | Due: ${action.due}`
      ),
      "",
      "## Follow-up",
      item.followUp,
      "",
      "## Transcript",
      item.transcript,
    ].join("\n");

    const blob = new Blob([markdown], {
      type: "text/markdown",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${safeFilename(item.title)}.md`;
    link.click();

    URL.revokeObjectURL(url);
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Copied to clipboard.");
    } catch {
      setNotice(
        "Clipboard access was blocked by your browser."
      );
    }
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
        <a className="brand" href="#top" aria-label="Ghost home">
          <span className="brand-mark">
            <AudioLines size={19} />
          </span>

          <span>
            G.H.O.S.T.
            <small>MEETING INTELLIGENCE</small>
          </span>
        </a>

        <div className="top-actions">
          <span className="privacy">
            <ShieldCheck size={14} />
            Your history stays in this browser
          </span>

          <button
            className="icon-button"
            onClick={() => setSettingsOpen(!settingsOpen)}
            aria-label="Open preferences"
          >
            <Settings2 size={18} />
          </button>
        </div>
      </header>

      {settingsOpen && (
        <section className="settings-panel">
          <div className="settings-head">
            <b>Your preferences</b>

            <button
              className="icon-button"
              onClick={() => setSettingsOpen(false)}
              aria-label="Close preferences"
            >
              <X size={16} />
            </button>
          </div>

          <label htmlFor="voice-style">
            Follow-up writing style
          </label>

          <select
            id="voice-style"
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

          <p>
            Choose how G.H.O.S.T. writes your follow-up drafts.
            This does not clone your voice.
          </p>
        </section>
      )}

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
          G.H.O.S.T. captures conversations, identifies what
          matters, and turns spoken words into decisions,
          action items and follow-ups.
        </p>

        <div className="hero-meta">
          <span>
            <ShieldCheck size={15} />
            Permission-based recording
          </span>

          <span>
            <AudioLines size={15} />
            Spoken meeting recap
          </span>

          <span>
            <FileText size={15} />
            Decisions + actions + follow-up
          </span>
        </div>
      </section>

      <section className="workspace">
        <div className="capture-panel">
          <div className="section-kicker">
            01 / CAPTURE
          </div>

          <div className="capture-title">
            <div>
              <h2>Capture the conversation</h2>
              <p>
                Choose what G.H.O.S.T. should listen to.
              </p>
            </div>

            <span className={`status-tag ${status}`}>
              {statusLabel}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 22,
              marginBottom: 20,
            }}
          >
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setMode("microphone");
                setError("");
              }}
              aria-pressed={mode === "microphone"}
              style={{
                flex: 1,
                minHeight: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                border:
                  mode === "microphone"
                    ? "1px solid #c5f277"
                    : "1px solid #343c38",
                background:
                  mode === "microphone"
                    ? "#26321f"
                    : "#0d1110",
                color:
                  mode === "microphone"
                    ? "#c5f277"
                    : "#aab4ae",
                fontSize: 12,
                fontWeight: 700,
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              <Mic size={17} />
              Quick Capture
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setMode("tab");
                setError("");
              }}
              aria-pressed={mode === "tab"}
              style={{
                flex: 1,
                minHeight: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                border:
                  mode === "tab"
                    ? "1px solid #c5f277"
                    : "1px solid #343c38",
                background:
                  mode === "tab"
                    ? "#26321f"
                    : "#0d1110",
                color:
                  mode === "tab"
                    ? "#c5f277"
                    : "#aab4ae",
                fontSize: 12,
                fontWeight: 700,
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              <Radio size={17} />
              Meeting Tab
            </button>
          </div>

          <label
            className="field-label"
            htmlFor="meeting-title"
          >
            Conversation name
          </label>

          <input
            id="meeting-title"
            className="text-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            placeholder="e.g. Client consultation"
            disabled={busy}
          />

          <div className={`record-visual ${status}`}>
            <div className="orb">
              {mode === "microphone" ? (
                <Mic size={32} />
              ) : (
                <AudioLines size={34} />
              )}
            </div>

            <div className="record-time">
              {formatTime(elapsed)}
            </div>

            <div className="record-caption">
              {status === "recording"
                ? "G.H.O.S.T. is listening."
                : status === "paused"
                  ? "Recording paused."
                  : status === "processing"
                    ? "Turning conversation into clear next steps..."
                    : mode === "microphone"
                      ? "Ready for a conversation."
                      : "Ready to capture your meeting."}
            </div>

            <div className="wave" aria-hidden="true">
              {Array.from({ length: 34 }, (_, index) => (
                <i
                  key={index}
                  style={{
                    height: `${8 + ((index * 17 + 11) % 29)}px`,
                  }}
                />
              ))}
            </div>
          </div>

          {status === "recording" || status === "paused" ? (
            <div
              style={{
                display: "flex",
                gap: 9,
              }}
            >
              {status === "recording" ? (
                <button
                  className="secondary-button"
                  style={{ flex: 1, marginTop: 0 }}
                  onClick={pauseRecording}
                >
                  <Pause size={16} />
                  Pause
                </button>
              ) : (
                <button
                  className="secondary-button"
                  style={{ flex: 1, marginTop: 0 }}
                  onClick={resumeRecording}
                >
                  <Play size={16} />
                  Resume
                </button>
              )}

              <button
                className="primary-button stop-button"
                style={{ flex: 1 }}
                onClick={stopRecording}
              >
                <Square size={15} fill="currentColor" />
                Finish
              </button>
            </div>
          ) : (
            <button
              className="primary-button"
              onClick={startRecording}
              disabled={status === "processing"}
            >
              {mode === "microphone" ? (
                <Mic size={17} />
              ) : (
                <Radio size={17} />
              )}

              {status === "processing"
                ? "Processing conversation..."
                : mode === "microphone"
                  ? "Start Quick Capture"
                  : "Share meeting tab & start"}
            </button>
          )}

          <div className="capture-note">
            <CircleHelp size={15} />

            <span>
              {mode === "microphone" ? (
                <>
                  Allow microphone access when asked. For an
                  in-person conversation, place your device
                  between participants. For a phone call, use
                  speakerphone. G.H.O.S.T. does not directly
                  intercept cellular call audio.
                </>
              ) : (
                <>
                  Choose your meeting tab and enable{" "}
                  <b>Share tab audio</b>. Keep the browser
                  sharing indicator visible while recording.
                </>
              )}
            </span>
          </div>

          <div className="capture-note">
            <ShieldCheck size={15} />

            <span>
              Recording should only begin with the knowledge
              and consent of everyone involved. Your saved
              meeting history is stored in this browser.
            </span>
          </div>

          <div className="or-divider">
            <span>OR</span>
          </div>

          <button
            className="text-action"
            onClick={() => setManualOpen(!manualOpen)}
          >
            <Plus size={15} />
            Import a transcript instead

            <ChevronDown
              size={14}
              className={manualOpen ? "rotated" : ""}
            />
          </button>

          {manualOpen && (
            <div className="manual-entry">
              <label htmlFor="manual-transcript">
                Review or edit your transcript
              </label>

              <textarea
                id="manual-transcript"
                value={transcript}
                onChange={(event) =>
                  setTranscript(event.target.value)
                }
                placeholder="Your transcribed conversation will appear here. Review or edit it before creating your brief..."
                rows={7}
              />

              <button
                className="secondary-button"
                disabled={
                  status === "processing" ||
                  transcript.trim().length < 30
                }
                onClick={() => analyze(transcript)}
              >
                Create my meeting brief
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
          <div className="section-kicker">
            02 / THE AFTERMATH
          </div>

          <div className="results-heading">
            <div>
              <h2>What matters now.</h2>
              <p>
                Your conversation, minus the mental replay.
              </p>
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
                    MEETING BRIEF
                  </span>

                  <h3>{active.title}</h3>

                  <p className="brief-date">
                    {new Date(
                      active.createdAt
                    ).toLocaleString()}
                  </p>
                </div>

                <button
                  className="icon-button"
                  aria-label="Export meeting brief"
                  onClick={() => exportMeeting(active)}
                >
                  <ArrowDownToLine size={17} />
                </button>
              </div>

              <div className="spoken-card">
                <div className="spoken-head">
                  <span>
                    <Volume2 size={15} />
                    THE SPOKEN SUMMARY
                  </span>

                  <button
                    onClick={() =>
                      playing
                        ? stopSpeech()
                        : speak(active.spokenSummary)
                    }
                    aria-label={
                      playing
                        ? "Stop spoken summary"
                        : "Play spoken summary"
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
                <h4>
                  <Check size={15} />
                  Decisions
                </h4>

                {active.decisions.length ? (
                  <ul>
                    {active.decisions.map((decision, index) => (
                      <li key={index}>{decision}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">
                    No firm decisions identified.
                  </p>
                )}
              </div>

              <div className="brief-section">
                <h4>
                  <ArrowDownToLine size={15} />
                  Action items
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

              <div className="brief-section followup">
                <div className="follow-head">
                  <h4>
                    <FileText size={15} />
                    Follow-up draft
                  </h4>

                  <button
                    className="mini-action"
                    onClick={() => copy(active.followUp)}
                  >
                    <Copy size={13} />
                    Copy
                  </button>
                </div>

                <p>{active.followUp}</p>
              </div>

              <div className="brief-section">
                <div className="follow-head">
                  <h4>
                    <FileText size={15} />
                    Original transcript
                  </h4>

                  <button
                    className="mini-action"
                    onClick={() => copy(active.transcript)}
                  >
                    <Copy size={13} />
                    Copy
                  </button>
                </div>

                <p
                  style={{
                    fontSize: 11,
                    lineHeight: 1.7,
                    color: "#aeb8b0",
                    whiteSpace: "pre-wrap",
                    maxHeight: 220,
                    overflowY: "auto",
                  }}
                >
                  {active.transcript}
                </p>
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
                  <Trash2 size={14} />
                  Delete
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
                Capture your next conversation. G.H.O.S.T.
                will organise the summary, decisions and
                follow-up here.
              </p>

              <span>
                YOUR NEXT STEP IS ON THE LEFT <span>↖</span>
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
        </p>

        <span className="version">
          EARLY ACCESS BUILD · 02
        </span>
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
    </main>
  );
}
