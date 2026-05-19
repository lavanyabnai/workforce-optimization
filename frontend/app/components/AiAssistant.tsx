import { useEffect, useRef, useState } from "react";
import {
  FALLBACK_RESPONSE,
  PLAN_SCRIPTS,
  SCHEDULE_SCRIPTS,
  type AssistantScript,
} from "~/lib/assistant-scripts";
import { useUiStore } from "~/stores/ui";

type Context = "plan" | "schedule";

type CitationChip = { label: string; selector: string };

function streamChunks(
  chunks: string[],
  onChunk: (text: string) => void,
  onDone: () => void
) {
  let i = 0;
  function next() {
    if (i >= chunks.length) {
      onDone();
      return;
    }
    onChunk(chunks[i]);
    i++;
    setTimeout(next, 30);
  }
  setTimeout(next, 30);
}

function pulseElement(selector: string) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("assistant-pulse");
  setTimeout(() => el.classList.remove("assistant-pulse"), 1500);
}

// ── Toggle button (exported so wizard shells can render it) ──────────────────

export function AiAssistantToggle() {
  const { assistantOpen, setAssistantOpen } = useUiStore();
  return (
    <button
      type="button"
      aria-label="Ask BlueNorth AI"
      className="assistant-toggle"
      onClick={() => setAssistantOpen(!assistantOpen)}
      title="Ask BlueNorth"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="10" cy="10" r="9" />
        <line x1="10" y1="9" x2="10" y2="14" />
        <circle cx="10" cy="6" r="0.5" fill="currentColor" stroke="none" />
      </svg>
    </button>
  );
}

// ── Slide-out panel ──────────────────────────────────────────────────────────

export function AiAssistant({ context }: { context: Context }) {
  const { assistantOpen, setAssistantOpen } = useUiStore();
  const scripts = context === "plan" ? PLAN_SCRIPTS : SCHEDULE_SCRIPTS;

  const [response, setResponse] = useState<string>("");
  const [streaming, setStreaming] = useState(false);
  const [citations, setCitations] = useState<CitationChip[]>([]);
  const [freeText, setFreeText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function resetState() {
    setResponse("");
    setCitations([]);
    setStreaming(false);
  }

  function handleScript(script: AssistantScript) {
    resetState();
    setStreaming(true);
    let accumulated = "";
    streamChunks(
      script.chunks,
      (chunk) => {
        accumulated += chunk;
        setResponse(accumulated);
      },
      () => {
        setStreaming(false);
        setCitations(script.citations);
      }
    );
  }

  function handleFreeTextSend() {
    if (!freeText.trim()) return;
    resetState();
    setStreaming(true);
    const fallbackChunks = FALLBACK_RESPONSE.match(/[\s\S]{1,14}/g) ?? [FALLBACK_RESPONSE];
    streamChunks(
      fallbackChunks,
      (chunk) => setResponse((prev) => prev + chunk),
      () => setStreaming(false)
    );
    setFreeText("");
  }

  // Scroll text area to bottom as text streams in
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [response]);

  return (
    <>
      {/* Backdrop (only on mobile) */}
      {assistantOpen && (
        <div
          className="assistant-backdrop"
          onClick={() => setAssistantOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`assistant-panel${assistantOpen ? " assistant-panel--open" : ""}`}
        aria-label="Ask BlueNorth"
      >
        {/* Header */}
        <div className="assistant-panel__header">
          <span className="assistant-panel__title">Ask BlueNorth</span>
          <button
            type="button"
            className="assistant-panel__close"
            onClick={() => setAssistantOpen(false)}
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="3" x2="13" y2="13" />
              <line x1="13" y1="3" x2="3" y2="13" />
            </svg>
          </button>
        </div>

        {/* Suggested prompts */}
        <div className="assistant-panel__prompts">
          <span className="assistant-panel__section-label">Suggested</span>
          {scripts.map((s) => (
            <button
              key={s.prompt}
              type="button"
              className="assistant-prompt-btn"
              onClick={() => handleScript(s)}
              disabled={streaming}
            >
              {s.prompt}
            </button>
          ))}
        </div>

        {/* Response area */}
        <div className="assistant-panel__response-wrap">
          <textarea
            ref={textareaRef}
            className="assistant-panel__response"
            readOnly
            value={response || (streaming ? "" : "Select a prompt above to get started.")}
            placeholder="Response will appear here…"
          />
          {streaming && <span className="assistant-panel__cursor">▋</span>}

          {/* Citation chips */}
          {citations.length > 0 && (
            <div className="assistant-citations">
              {citations.map((c) => (
                <button
                  key={c.selector}
                  type="button"
                  className="assistant-citation-chip"
                  onClick={() => pulseElement(c.selector)}
                  title={`Scroll to ${c.label}`}
                >
                  <sup>↗</sup> {c.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Free-text input */}
        <div className="assistant-panel__input-row">
          <input
            type="text"
            className="assistant-panel__input"
            placeholder="Ask anything…"
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleFreeTextSend();
            }}
            disabled={streaming}
          />
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleFreeTextSend}
            disabled={streaming || !freeText.trim()}
          >
            Send
          </button>
        </div>
      </aside>
    </>
  );
}
