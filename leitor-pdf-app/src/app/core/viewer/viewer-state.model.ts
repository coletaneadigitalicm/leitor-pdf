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
}

export type ViewerStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ViewerState {
  documents: ViewerDocument[];
  activeId: string | null;
  status: ViewerStatus;
  error: string | null;
}
