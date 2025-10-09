import { ViewerDocument, ViewerState } from './viewer-state.model';

export function createInitialViewerState(): ViewerState {
  return {
    documents: [],
    activeId: null,
    status: 'idle',
    error: null,
  };
}

export function buildDocumentFromUrl(url: string): ViewerDocument {
  return {
    id: createDocumentIdFromUrl(url),
    name: decodeURIComponent(deriveDocumentName(url)),
    sourceType: 'url',
    url,
    lastUpdatedAt: Date.now(),
    status: 'idle',
    error: null,
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
  return url.trim();
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
