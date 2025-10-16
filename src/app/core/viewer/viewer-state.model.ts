export type ViewerSourceType = 'url' | 'file';

export type ViewerDocumentStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ViewerDocument {
  id: string;
  name: string;
  sourceType: ViewerSourceType;
  url?: string;
  file?: File;
  lastUpdatedAt: number;
  status: ViewerDocumentStatus;
  error: string | null;
  pageCount?: number;
  initialPage?: number; // Página inicial solicitada
  customTitle?: boolean; // Indica se o nome foi fornecido customizadamente
  cachedBlobUrl?: string; // Cached Blob URL for instant loading
  lastViewedPage?: number; // Last page user was on
  lastZoomLevel?: string | number; // Last zoom ('auto', 1.5, etc.)
  lastScrollY?: number; // Optional: scroll offset
}

export type ViewerStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ViewerState {
  documents: ViewerDocument[];
  activeId: string | null;
  status: ViewerStatus;
  error: string | null;
}
