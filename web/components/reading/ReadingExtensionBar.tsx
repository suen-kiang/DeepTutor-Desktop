"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  listReadingExtensions,
  runReadingExtension,
  type ReadingExtensionManifest,
  type ReadingExtensionResult,
} from "@/lib/reading-api";

export function ReadingExtensionBar({
  materialId,
  locator,
  selection,
  onError,
}: {
  materialId: string;
  locator: number;
  selection?: string;
  onError: (message: string) => void;
}) {
  const { i18n, t } = useTranslation();
  const [extensions, setExtensions] = useState<ReadingExtensionManifest[]>([]);
  const [busy, setBusy] = useState("");
  const [result, setResult] = useState<ReadingExtensionResult | null>(null);

  useEffect(() => {
    let active = true;
    void listReadingExtensions()
      .then((rows) => {
        if (active) setExtensions(rows);
      })
      .catch((error) => {
        if (active)
          onError(error instanceof Error ? error.message : String(error));
      });
    return () => {
      active = false;
      window.speechSynthesis?.cancel();
    };
  }, [materialId, onError]);

  useEffect(() => setResult(null), [locator, materialId]);

  const actions = useMemo(
    () =>
      extensions.flatMap((extension) =>
        extension.actions.map((action) => ({ extension, action })),
      ),
    [extensions],
  );

  async function run(
    extension: ReadingExtensionManifest,
    action: ReadingExtensionManifest["actions"][number],
  ) {
    const key = `${extension.id}:${action.id}`;
    setBusy(key);
    try {
      const next = await runReadingExtension(
        materialId,
        extension.id,
        action.id,
        {
          locator,
          selection: selection || "",
          locale: i18n.language,
        },
      );
      setResult(next);
      if (next.type === "browser_speech") {
        const text = String(next.payload.text || "");
        if (!("speechSynthesis" in window) || !text) {
          onError(t("No speech voice is available in this browser."));
          return;
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = String(next.payload.locale || i18n.language);
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy("");
    }
  }

  if (actions.length === 0) return null;
  return (
    <>
      <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-[var(--border)] bg-[var(--muted)]/25 px-2.5 py-2">
        {actions.map(({ extension, action }) => {
          const key = `${extension.id}:${action.id}`;
          const disabled =
            Boolean(busy) ||
            (action.requires.includes("selection") && !selection?.trim());
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => void run(extension, action)}
              className="inline-flex h-8 min-w-[88px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 text-xs font-medium text-[var(--foreground)] transition hover:bg-[var(--muted)] disabled:opacity-50"
            >
              {busy === key ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              <span className="truncate">{action.label}</span>
            </button>
          );
        })}
      </div>
      {result && result.type !== "browser_speech" ? (
        <ExtensionResult
          result={result}
          closeLabel={t("Close")}
          onClose={() => setResult(null)}
        />
      ) : null}
    </>
  );
}

function ExtensionResult({
  result,
  closeLabel,
  onClose,
}: {
  result: ReadingExtensionResult;
  closeLabel: string;
  onClose: () => void;
}) {
  const questions = Array.isArray(result.payload.questions)
    ? (result.payload.questions as Array<{
        id?: string;
        prompt: string;
        choices: string[];
      }>)
    : [];
  const items = Array.isArray(result.payload.items)
    ? result.payload.items.map(String)
    : [];
  const body = String(result.payload.body || result.payload.overview || "");
  return (
    <section className="relative shrink-0 border-b border-[var(--border)] bg-[var(--card)] px-3 py-3 text-xs text-[var(--foreground)]">
      <button
        type="button"
        onClick={onClose}
        aria-label={closeLabel}
        className="absolute right-2 top-2 text-[var(--muted-foreground)]"
      >
        <X size={14} />
      </button>
      <h3 className="pr-6 font-semibold">{result.title}</h3>
      {result.message ? (
        <p className="mt-1 text-[var(--muted-foreground)]">{result.message}</p>
      ) : null}
      {body ? <p className="mt-2 whitespace-pre-wrap">{body}</p> : null}
      {items.length ? (
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      {questions.map((question, index) => (
        <div key={question.id || index} className="mt-3">
          <p className="font-medium">{question.prompt}</p>
          <ol className="mt-1 list-inside list-[upper-alpha] space-y-0.5 text-[var(--muted-foreground)]">
            {question.choices.map((choice) => (
              <li key={choice}>{choice}</li>
            ))}
          </ol>
        </div>
      ))}
    </section>
  );
}
