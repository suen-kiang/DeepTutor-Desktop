import type { AnnotationItem, ReadingTextSelector } from "@/lib/reading-api";

export interface W3CTextAnnotation {
  "@context": "http://www.w3.org/ns/anno.jsonld";
  id: string;
  type: "Annotation";
  body: Array<{
    type: "TextualBody";
    purpose: "commenting" | "highlighting";
    value: string;
  }>;
  target: {
    source: string;
    selector: ReadingTextSelector[];
  };
}

export interface RecogitoTextAnnotation {
  id: string;
  bodies: [];
  target: {
    annotation: string;
    selector: Array<{ quote: string; start: number; end: number }>;
  };
  properties: {
    annotationId: string;
    color: string;
    kind: AnnotationItem["kind"];
  };
}

/**
 * Resolve a persisted W3C quote/position pair against the currently rendered
 * text. Position is accepted only when it still covers the quote; otherwise a
 * unique quote plus prefix/suffix context is used to re-anchor it.
 */
export function resolveTextSelectors(
  text: string,
  annotation: Pick<AnnotationItem, "quote" | "selectors">,
): ReadingTextSelector[] | null {
  const stored = annotation.selectors ?? [];
  const quoteSelector = stored.find(
    (selector) => selector.type === "TextQuoteSelector",
  );
  const positionSelector = stored.find(
    (selector) => selector.type === "TextPositionSelector",
  );
  const exact =
    quoteSelector?.type === "TextQuoteSelector"
      ? quoteSelector.exact
      : annotation.quote;
  if (!exact) return null;

  if (
    positionSelector?.type === "TextPositionSelector" &&
    positionSelector.start >= 0 &&
    positionSelector.end <= text.length &&
    normalise(text.slice(positionSelector.start, positionSelector.end)) ===
      normalise(exact)
  ) {
    const canonicalExact = text.slice(
      positionSelector.start,
      positionSelector.end,
    );
    return [
      quoteAt(text, canonicalExact, positionSelector.start),
      positionSelector,
    ];
  }

  const candidates = occurrences(text, exact);
  const contextual = candidates.filter(({ start, end }) => {
    if (quoteSelector?.type !== "TextQuoteSelector") return true;
    const prefixMatches =
      !quoteSelector.prefix ||
      normalise(text.slice(0, start)).endsWith(normalise(quoteSelector.prefix));
    const suffixMatches =
      !quoteSelector.suffix ||
      normalise(text.slice(end)).startsWith(normalise(quoteSelector.suffix));
    return prefixMatches && suffixMatches;
  });
  const matches = contextual.length ? contextual : candidates;
  if (matches.length !== 1) return null;
  const { start, end } = matches[0];
  const canonicalExact = text.slice(start, end);
  return [
    quoteAt(text, canonicalExact, start),
    { type: "TextPositionSelector", start, end },
  ];
}

export function toW3CTextAnnotation(
  annotation: AnnotationItem,
  renderedText: string,
  source: string,
): W3CTextAnnotation | null {
  const selector = resolveTextSelectors(renderedText, annotation);
  if (!selector) return null;
  return {
    "@context": "http://www.w3.org/ns/anno.jsonld",
    id: annotation.annotation_id,
    type: "Annotation",
    body: [
      {
        type: "TextualBody",
        purpose: annotation.note ? "commenting" : "highlighting",
        value: annotation.note,
      },
    ],
    target: { source, selector },
  };
}

export function toRecogitoTextAnnotation(
  annotation: AnnotationItem,
  renderedText: string,
): RecogitoTextAnnotation | null {
  const selectors = resolveTextSelectors(renderedText, annotation);
  const quote = selectors?.find(
    (selector) => selector.type === "TextQuoteSelector",
  );
  const position = selectors?.find(
    (selector) => selector.type === "TextPositionSelector",
  );
  if (
    quote?.type !== "TextQuoteSelector" ||
    position?.type !== "TextPositionSelector"
  ) {
    return null;
  }
  return {
    id: annotation.annotation_id,
    bodies: [],
    target: {
      annotation: annotation.annotation_id,
      selector: [
        { quote: quote.exact, start: position.start, end: position.end },
      ],
    },
    properties: {
      annotationId: annotation.annotation_id,
      color: annotation.color,
      kind: annotation.kind,
    },
  };
}

function quoteAt(
  text: string,
  exact: string,
  start: number,
): ReadingTextSelector {
  return {
    type: "TextQuoteSelector",
    exact,
    prefix: text.slice(Math.max(0, start - 10), start),
    suffix: text.slice(start + exact.length, start + exact.length + 10),
  };
}

function normalise(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function occurrences(
  text: string,
  quote: string,
): Array<{ start: number; end: number }> {
  const words = quote.match(/\S+/g);
  if (!words?.length) return [];
  const pattern = new RegExp(words.map(escapeRegExp).join("\\s+"), "g");
  return [...text.matchAll(pattern)].map((match) => ({
    start: match.index,
    end: match.index + match[0].length,
  }));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
