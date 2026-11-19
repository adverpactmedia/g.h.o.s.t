"use client";

import { useState } from "react";
import type { MeetingResult } from "@/types/meeting";
import { MessageCircle, Mic, Send, Volume2 } from "lucide-react";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  start(): void;
};

type Props = { meeting: MeetingResult };

export default function MeetingAssistant({ meeting }: Props) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);

  async function ask(value?: string) {
    const message = (value ?? question).trim();
    if (!message || busy) return;
    setQuestion("");
    setMessages(current => [...current, { role: "user", text: message }]);
    setBusy(true);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, meeting }),
      });
      const data: { answer?: string; error?: string } = await response.json();
      if (!response.ok || !data.answer) throw new Error(data.error || "Assistant request failed.");
      setMessages(current => [...current, { role: "assistant", text: data.answer! }]);
    } catch (error) {
      setMessages(current => [...current, { role: "assistant", text: error instanceof Error ? error.message : "The assistant could not answer." }]);
    } finally {
      setBusy(false);
    }
  }

  function listen() {
    const host = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Speech = host.SpeechRecognition || host.webkitSpeechRecognition;
    if (!Speech) {
      setMessages(current => [...current, { role: "assistant", text: "Voice input is not supported by this browser. Type your question instead." }]);
      return;
    }
    const recognition = new Speech();
    recognition.lang = "en-CA";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = event => {
      const transcript = event.results[0]?.[0]?.transcript || "";
      if (transcript.trim()) void ask(transcript);
    };
    recognition.onerror = () => setMessages(current => [...current, { role: "assistant", text: "Microphone input failed. You can type your question instead." }]);
    try { recognition.start(); } catch {
      setMessages(current => [...current, { role: "assistant", text: "The microphone is busy. Try again or type your question." }]);
    }
  }

  return (
    <section className="brief-section" style={{ border: "1px solid #b89438", borderRadius: 14, padding: 16, background: "rgba(185,148,56,.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h4 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}><MessageCircle size={16} /> ASK G.H.O.S.T.</h4>
          <p className="muted" style={{ margin: "6px 0 0" }}>Ask questions about this meeting&apos;s transcript, decisions and action register.</p>
        </div>
        <button className="mini-action" onClick={() => setOpen(value => !value)}>{open ? "Close" : "Ask"}</button>
      </div>
      {open && (
        <div style={{ marginTop: 14 }}>
          <div aria-live="polite" style={{ display: "grid", gap: 8, maxHeight: 260, overflowY: "auto", marginBottom: 10 }}>
            {messages.length === 0 && <p className="muted">Try: “What did we actually agree to?” or “Which actions have no owner?”</p>}
            {messages.map((item, index) => (
              <div key={index} style={{ justifySelf: item.role === "user" ? "end" : "start", maxWidth: "95%", padding: 10, borderRadius: 10, background: item.role === "user" ? "#453817" : "#202938", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                <b style={{ display: "block", fontSize: 11, opacity: .75, marginBottom: 4 }}>{item.role === "user" ? "YOU" : "G.H.O.S.T."}</b>
                {item.text}
                {item.role === "assistant" && typeof window !== "undefined" && "speechSynthesis" in window && (
                  <button className="mini-action" style={{ marginTop: 8 }} onClick={() => { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(item.text)); }}><Volume2 size={13} /> Speak</button>
                )}
              </div>
            ))}
            {busy && <p className="muted">Thinking…</p>}
          </div>
          <form onSubmit={event => { event.preventDefault(); void ask(); }} style={{ display: "flex", gap: 8 }}>
            <button className="mini-action" type="button" aria-label="Ask by voice" onClick={listen}><Mic size={15} /></button>
            <input value={question} onChange={event => setQuestion(event.target.value)} maxLength={1200} placeholder="Ask about this meeting…" style={{ flex: 1, minWidth: 0 }} />
            <button className="mini-action" type="submit" disabled={busy || !question.trim()}><Send size={15} /> Send</button>
          </form>
          <p className="muted" style={{ fontSize: 11 }}>Meeting content is sent to Google Gemini for each question. Answers are read-only; verify important conclusions against the transcript.</p>
        </div>
      )}
    </section>
  );
}
