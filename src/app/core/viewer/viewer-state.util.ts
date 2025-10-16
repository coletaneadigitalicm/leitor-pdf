import { ViewerDocument, ViewerState } from './viewer-state.model';

export interface ParsedUrl {
  baseUrl: string;      // URL sem fragmento
  fragment: string | null;  // Fragmento completo (#page=277)
  pageNumber: number | null; // Número da página extraído
}

export function parseUrlWithFragment(url: string): ParsedUrl {
  const [baseUrl, fragment] = url.split('#');
  const pageMatch = fragment?.match(/page=(\d+)/);
  const pageNumber = pageMatch ? parseInt(pageMatch[1], 10) : null;
  
  return {
    baseUrl: baseUrl.trim(),
    fragment: fragment ? `#${fragment}` : null,
    pageNumber
  };
}

export function createInitialViewerState(): ViewerState {
  return {
    documents: [],
    activeId: null,
    status: 'idle',
    error: null,
  };
}

export function buildDocumentFromUrl(url: string, customTitle?: string): ViewerDocument {
  const { baseUrl, pageNumber } = parseUrlWithFragment(url);
  const title = customTitle?.trim();
  const isCustomTitle = Boolean(title);
  
  return {
    id: createDocumentIdFromUrl(url), // ID baseado na URL base
    name: title || decodeURIComponent(deriveDocumentName(baseUrl)),
    sourceType: 'url',
    url: baseUrl, // Armazenar URL base
    initialPage: pageNumber ?? undefined,
    lastUpdatedAt: Date.now(),
    status: 'idle',
    error: null,
    customTitle: isCustomTitle,
  };
}

export function buildDocumentFromFile(file: File): ViewerDocument {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}`,
    name: file.name,
    sourceType: 'file',
    file,
    lastUpdatedAt: Date.now(),
    status: 'idle',
    error: null,
  };
}

export function createDocumentIdFromUrl(url: string): string {
  const { baseUrl } = parseUrlWithFragment(url);
  return baseUrl.trim(); // ID baseado apenas na URL base
}

function deriveDocumentName(url: string): string {
  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;
    const segments = pathname?.split('/') ?? [];
    const candidate = segments.filter(Boolean).pop();
    return candidate ?? parsedUrl.host ?? url;
  } catch {
    return url;
  }
}
