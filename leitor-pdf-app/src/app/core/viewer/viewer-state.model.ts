export type ViewerSourceType = 'url' | 'file';

export interface ViewerDocument {
  id: string;
  name: string;
  sourceType: ViewerSourceType;
  url?: string;
  file?: File;
  lastUpdatedAt: number;
}

export type ViewerStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ViewerState {
  status: ViewerStatus;
  document: ViewerDocument | null;
  error: string | null;
}
