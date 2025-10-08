import { ViewerDocument, ViewerState } from './viewer-state.model';

export function createInitialViewerState(): ViewerState {
  return {
    status: 'idle',
    document: null,
    error: null,
  };
}

export function buildDocumentFromUrl(url: string): ViewerDocument {
  return {
    id: url,
    name: decodeURIComponent(deriveDocumentName(url)),
    sourceType: 'url',
    url,
    lastUpdatedAt: Date.now(),
  };
}

export function buildDocumentFromFile(file: File): ViewerDocument {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}`,
    name: file.name,
    sourceType: 'file',
    file,
    lastUpdatedAt: Date.now(),
  };
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
