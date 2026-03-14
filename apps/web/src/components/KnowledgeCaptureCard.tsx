import { useMemo, useState } from "react";
import { Mic, Save, Square, UploadCloud } from "lucide-react";

import type { DomainKnowledgeEntry } from "@mentat/types";

import { useVoiceDictation } from "../hooks/useVoiceDictation";
import { formatSessionDate } from "../lib/utils";
import { SurfaceCard } from "./SurfaceCard";

interface KnowledgeCaptureCardProps {
  entries: DomainKnowledgeEntry[];
  isLoading: boolean;
  error: string | null;
  syncMessage: string | null;
  onSave: (input: {
    domainGroup: string;
    subdomain: string;
    transcript: string;
    source: "voice" | "text";
  }) => Promise<void>;
  onSync: () => Promise<void>;
}

const suggestedDomains = ["Sports", "Work", "Learning", "Home", "Health"];

export function KnowledgeCaptureCard({
  entries,
  isLoading,
  error,
  syncMessage,
  onSave,
  onSync,
}: KnowledgeCaptureCardProps) {
  const voice = useVoiceDictation();
  const [domainGroup, setDomainGroup] = useState("Sports");
  const [subdomain, setSubdomain] = useState("Chess");
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const saveDisabled = useMemo(
    () =>
      !domainGroup.trim() ||
      !subdomain.trim() ||
      !voice.transcript.trim() ||
      isSaving,
    [domainGroup, isSaving, subdomain, voice.transcript],
  );

  return (
    <SurfaceCard
      eyebrow="Knowledge"
      title="Voice-track domains and sync to Obsidian"
      description="Capture what you learned in a domain/subdomain, save it as structured knowledge, and sync the markdown pages into your Obsidian vault."
      action={
        <button
          className="ghost-button"
          disabled={isSyncing}
          onClick={() => {
            setIsSyncing(true);
            void onSync()
              .catch(() => undefined)
              .finally(() => setIsSyncing(false));
          }}
          type="button"
        >
          <UploadCloud size={16} />
          {isSyncing ? "Syncing..." : "Sync to Obsidian"}
        </button>
      }
    >
      <div className="stack-md">
        <div className="knowledge-grid">
          <label className="field">
            <span className="field__label">Domain</span>
            <input
              className="text-input"
              list="mentat-domains"
              onChange={(event) => setDomainGroup(event.target.value)}
              value={domainGroup}
            />
            <datalist id="mentat-domains">
              {suggestedDomains.map((domain) => (
                <option key={domain} value={domain} />
              ))}
            </datalist>
          </label>

          <label className="field">
            <span className="field__label">Subdomain</span>
            <input
              className="text-input"
              onChange={(event) => setSubdomain(event.target.value)}
              value={subdomain}
            />
          </label>
        </div>

        <div className="action-row">
          <button
            className="primary-button"
            disabled={!voice.supported || voice.isListening}
            onClick={() => {
              voice.start();
            }}
            type="button"
          >
            <Mic size={18} />
            {voice.isListening ? "Listening..." : "Start voice capture"}
          </button>
          <button
            className="ghost-button"
            disabled={!voice.isListening}
            onClick={() => {
              voice.stop();
            }}
            type="button"
          >
            <Square size={16} />
            Stop capture
          </button>
        </div>

        <label className="field">
          <span className="field__label">Transcript</span>
          <textarea
            className="text-area"
            onChange={(event) => voice.setTranscript(event.target.value)}
            placeholder="Speak or type what happened in this domain and what you learned."
            rows={6}
            value={voice.transcript}
          />
        </label>

        {voice.error ? <div className="error-banner">{voice.error}</div> : null}
        {error ? <div className="error-banner">{error}</div> : null}
        {syncMessage ? <div className="callout"><p>{syncMessage}</p></div> : null}

        <div className="action-row">
          <button
            className="primary-button"
            disabled={saveDisabled}
            onClick={() => {
              setIsSaving(true);
              void onSave({
                domainGroup,
                subdomain,
                transcript: voice.transcript,
                source: voice.source,
              })
                .then(() => {
                  voice.reset();
                })
                .catch(() => undefined)
                .finally(() => {
                  setIsSaving(false);
                });
            }}
            type="button"
          >
            <Save size={18} />
            {isSaving ? "Saving..." : "Save knowledge"}
          </button>
        </div>

        <div className="stack-sm">
          <p className="section-label">Recent entries</p>
          {isLoading ? <p className="muted-copy">Loading knowledge...</p> : null}
          {entries.length === 0 ? (
            <p className="muted-copy">
              No domain knowledge captured yet.
            </p>
          ) : (
            entries.slice(0, 5).map((entry) => (
              <article className="knowledge-item" key={entry.entryId}>
                <div className="knowledge-item__header">
                  <strong>
                    {entry.domainGroup} / {entry.subdomain}
                  </strong>
                  <span className="status-chip status-chip--memory">
                    {entry.source}
                  </span>
                </div>
                <p>{entry.summary}</p>
                <span className="timeline-item__meta">
                  {formatSessionDate(entry.createdAt)}
                </span>
              </article>
            ))
          )}
        </div>
      </div>
    </SurfaceCard>
  );
}
