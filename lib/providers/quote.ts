import { buildResponse, fetchJson } from "@/lib/providers/http";
import type { Locale, QuoteData, SourceResponse } from "@/lib/types/liveboard";

const WIKIQUOTE_ENDPOINT = "https://wq-quote-of-the-day-parser.toolforge.org/api/quote_of_the_day";
const ZEN_QUOTES_TODAY_ENDPOINT = "https://zenquotes.io/api/today";
const MYMEMORY_TRANSLATE_ENDPOINT = "https://api.mymemory.translated.net/get";

const FALLBACK_QUOTES: Array<{ quote: string; author: string }> = [
  {
    quote: "La liberte consiste a pouvoir faire tout ce qui ne nuit pas a autrui.",
    author: "Montesquieu",
  },
  { quote: "Le doute est le commencement de la sagesse.", author: "Aristote" },
  { quote: "On ne voit bien qu'avec le coeur.", author: "Antoine de Saint-Exupery" },
  { quote: "Le hasard ne favorise que les esprits prepares.", author: "Louis Pasteur" },
  { quote: "Il faut imaginer Sisyphe heureux.", author: "Albert Camus" },
  {
    quote: "Le plus grand secret pour le bonheur, c'est d'etre bien avec soi.",
    author: "Fontenelle",
  },
  { quote: "Rien ne se perd, rien ne se cree, tout se transforme.", author: "Lavoisier" },
  { quote: "Ce qui depend de nous, c'est notre jugement.", author: "Epictete" },
  { quote: "Vivre, c'est naitre lentement.", author: "Antoine de Saint-Exupery" },
  { quote: "La simplicite est la sophistication supreme.", author: "Leonardo da Vinci" },
  {
    quote: "Le veritable voyage de decouverte ne consiste pas a chercher de nouveaux paysages.",
    author: "Marcel Proust",
  },
  { quote: "L'avenir appartient a ceux qui se levent tot.", author: "Proverbe" },
  { quote: "La culture ne s'herite pas, elle se conquiert.", author: "Andre Malraux" },
  { quote: "La joie est en tout, il faut savoir l'extraire.", author: "Confucius" },
  { quote: "Le courage, c'est de chercher la verite et de la dire.", author: "Jean Jaures" },
  { quote: "Toute connaissance degénère en probabilite.", author: "David Hume" },
  {
    quote: "Le temps est un grand maitre, le malheur est qu'il tue ses eleves.",
    author: "Hector Berlioz",
  },
  { quote: "Mieux vaut allumer une bougie que maudire l'obscurite.", author: "Lao Tseu" },
  { quote: "La beaute est dans les yeux de celui qui regarde.", author: "Oscar Wilde" },
  { quote: "Le savoir est la seule richesse qu'on ne peut pas voler.", author: "Proverbe" },
];

function pickFallbackQuote(): QuoteData {
  const dayIndex = Math.floor(Date.now() / 86_400_000) % FALLBACK_QUOTES.length;
  const picked = FALLBACK_QUOTES[dayIndex];

  return {
    quote: picked.quote,
    author: picked.author,
    sourceLabel: "Fallback local",
    isFallback: true,
  };
}

function normalizeQuote(payload: unknown): QuoteData | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const root = payload as Record<string, unknown>;

  const candidates: Array<Record<string, unknown>> = [];
  if (Array.isArray(root.quotes) && root.quotes[0] && typeof root.quotes[0] === "object") {
    candidates.push(root.quotes[0] as Record<string, unknown>);
  }
  if (root.quote && typeof root.quote === "object") {
    candidates.push(root.quote as Record<string, unknown>);
  }
  if (root.quote_of_the_day && typeof root.quote_of_the_day === "object") {
    candidates.push(root.quote_of_the_day as Record<string, unknown>);
  }
  candidates.push(root);

  for (const candidate of candidates) {
    const quote =
      (candidate.quote as string) ??
      (candidate.text as string) ??
      (candidate.quotation as string) ??
      (candidate.message as string);

    const author =
      (candidate.author as string) ??
      (candidate.source as string) ??
      (candidate.by as string) ??
      (candidate.wiki as string);

    if (
      typeof quote === "string" &&
      typeof author === "string" &&
      quote.length > 0 &&
      author.length > 0
    ) {
      return {
        quote: quote.replace(/\s+/g, " ").trim(),
        author: author.replace(/\s+/g, " ").trim(),
        sourceLabel: "Wikiquote",
        sourceUrl: WIKIQUOTE_ENDPOINT,
      };
    }
  }

  return null;
}

function normalizeZenQuote(payload: unknown): QuoteData | null {
  if (!Array.isArray(payload) || payload.length === 0) {
    return null;
  }

  const first = payload[0];
  if (!first || typeof first !== "object") {
    return null;
  }

  const row = first as Record<string, unknown>;
  const quote = typeof row.q === "string" ? row.q.trim() : "";
  const author = typeof row.a === "string" ? row.a.trim() : "";

  if (!quote || !author) {
    return null;
  }

  return {
    quote: quote.replace(/\s+/g, " ").trim(),
    author: author.replace(/\s+/g, " ").trim(),
    sourceLabel: "ZenQuotes",
    sourceUrl: ZEN_QUOTES_TODAY_ENDPOINT,
  };
}

type MyMemoryResponse = {
  responseData?: {
    translatedText?: string;
  };
};

function looksFrench(text: string): boolean {
  const value = text.toLowerCase();
  if (/[àâçéèêëîïôûùüÿœ]/.test(value)) {
    return true;
  }
  return /\b(le|la|les|des|une|un|et|que|qui|dans|pas|pour|avec|sur)\b/.test(value);
}

async function translateToFrench(text: string): Promise<string | null> {
  const params = new URLSearchParams({
    q: text,
    langpair: "en|fr",
  });

  const payload = await fetchJson<MyMemoryResponse>(
    `${MYMEMORY_TRANSLATE_ENDPOINT}?${params.toString()}`,
    {
      next: { revalidate: 3600 },
    },
  );

  const translated = payload.responseData?.translatedText;
  if (typeof translated !== "string" || translated.trim().length === 0) {
    return null;
  }

  return translated.replace(/\s+/g, " ").trim();
}

async function localizeQuote(
  data: QuoteData,
  lang: Locale,
  errors: string[],
): Promise<QuoteData | null> {
  if (lang !== "fr") {
    return data;
  }

  if (looksFrench(data.quote)) {
    return data;
  }

  try {
    const translated = await translateToFrench(data.quote);
    if (!translated) {
      errors.push("Traduction FR indisponible");
      return null;
    }

    return {
      ...data,
      quote: translated,
      sourceLabel: `${data.sourceLabel ?? "Source"} traduit en FR`,
    };
  } catch (error) {
    errors.push(error instanceof Error ? `Traduction FR: ${error.message}` : "Traduction FR indisponible");
    return null;
  }
}

export async function getQuoteOfDay(lang: Locale = "fr"): Promise<SourceResponse<QuoteData>> {
  const errors: string[] = [];

  try {
    const payload = await fetchJson<unknown>(WIKIQUOTE_ENDPOINT, {
      next: { revalidate: 3600 },
    });

    const normalized = normalizeQuote(payload);
    if (normalized) {
      const localized = await localizeQuote(normalized, lang, errors);
      if (!localized) {
        throw new Error("Wikiquote non francisable");
      }

      return buildResponse({
        source: "Wikiquote Parser",
        data: localized,
        health: "ok",
        ok: true,
      });
    }

    errors.push("Wikiquote format inattendu");
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Wikiquote indisponible");
  }

  try {
    const payload = await fetchJson<unknown>(ZEN_QUOTES_TODAY_ENDPOINT, {
      next: { revalidate: 3600 },
    });

    const normalized = normalizeZenQuote(payload);
    if (normalized) {
      const localized = await localizeQuote(normalized, lang, errors);
      if (!localized) {
        throw new Error("ZenQuotes non francisable");
      }

      return buildResponse({
        source: "ZenQuotes",
        data: localized,
        health: "ok",
        ok: true,
        message:
          errors.length > 0 ? "Wikiquote indisponible, source secondaire ZenQuotes activee." : undefined,
      });
    }

    errors.push("ZenQuotes format inattendu");
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "ZenQuotes indisponible");
  }

  const fallback = pickFallbackQuote();
  return buildResponse({
    source: "Wikiquote Parser",
    data: fallback,
    health: "degraded",
    ok: true,
    message:
      errors.length > 0
        ? `${errors.join(" | ")}. Fallback local active.`
        : "Fallback local active.",
  });
}
