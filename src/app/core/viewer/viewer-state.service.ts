import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

import { isValidPdfUrl } from '../utils/url.utils';
import {
  buildDocumentFromFile,
  buildDocumentFromUrl,
  createDocumentIdFromUrl,
  createInitialViewerState,
  parseUrlWithFragment,
} from './viewer-state.util';
import { ViewerDocument, ViewerState, ViewerStatus } from './viewer-state.model';

export interface LoadResult {
  success: boolean;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ViewerStateService {
  private readonly stateSubject = new BehaviorSubject<ViewerState>(createInitialViewerState());
  readonly state$ = this.stateSubject.asObservable();

  private lastExternalCombinationKey: string | null = null;

  get snapshot(): ViewerState {
    return this.stateSubject.value;
  }

  applyExternalSources(urls: string[], activeId?: string | null, titles?: string[]): void {
    console.log('[APPLY-SOURCES] Input URLs:', urls);
    
    const normalized = this.normalizeUrls(urls);
    console.log('[APPLY-SOURCES] Normalized URLs:', normalized);
    
    const combinationKey = this.buildCombinationKey(normalized);

    if (!normalized.length) {
      this.reset();
      this.lastExternalCombinationKey = null;
      return;
    }

    if (this.lastExternalCombinationKey === combinationKey) {
      if (activeId && this.snapshot.activeId !== activeId && this.hasDocument(activeId)) {
        this.setActiveDocument(activeId);
      }
      return;
    }

    this.setState((prev) => {
      const existingByUrl = new Map(
        prev.documents.filter((doc) => doc.url).map((doc) => [doc.url!, doc]),
      );

      const documents = normalized.map((url, index) => {
        const { baseUrl } = parseUrlWithFragment(url);
        const existing = existingByUrl.get(baseUrl);
        
        if (existing) {
          console.log(`[APPLY-SOURCES] Doc ${index}: Reusing existing`, existing.name);
          return {
            ...existing,
            lastUpdatedAt: Date.now(),
          } satisfies ViewerDocument;
        }
        
        const customTitle = titles?.[index];
        const newDoc = buildDocumentFromUrl(url, customTitle);
        console.log(`[APPLY-SOURCES] Doc ${index}: Created new`, {
          name: newDoc.name,
          id: newDoc.id,
          url: newDoc.url,
          initialPage: newDoc.initialPage,
          customTitle: newDoc.customTitle
        });
        return newDoc;
      });

      let nextActiveId: string | null = null;
      if (activeId && documents.some((doc) => doc.id === activeId)) {
        nextActiveId = activeId;
      } else {
        nextActiveId = documents[0]?.id ?? null;
      }
      
      console.log('[APPLY-SOURCES] Active ID will be:', nextActiveId);
      console.log('[APPLY-SOURCES] Documents order:', documents.map(d => d.name));

      return {
        ...prev,
        documents,
        activeId: nextActiveId,
      } satisfies ViewerState;
    });

    const activeDocument = this.getActiveDocument();
    if (activeDocument && activeDocument.status === 'idle') {
      console.log('[APPLY-SOURCES] Marking active doc as loading:', activeDocument.name);
      this.markDocumentLoading(activeDocument.id);
    }

    this.lastExternalCombinationKey = combinationKey;
  }

  addDocumentFromUrl(
    rawUrl: string,
    options?: { setActive?: boolean; prepend?: boolean },
  ): LoadResult {
    const url = rawUrl?.trim();
    if (!isValidPdfUrl(url)) {
      const error = 'URL inválida. Certifique-se de incluir http://, https:// ou blob://';
      return { success: false, error };
    }

    const id = createDocumentIdFromUrl(url);
    const existing = this.snapshot.documents.find((doc) => doc.id === id);

    if (existing) {
      if (options?.setActive !== false) {
        this.setActiveDocument(existing.id);
        if (existing.status === 'idle') {
          this.markDocumentLoading(existing.id);
        }
      }
      return { success: true };
    }

    const document = buildDocumentFromUrl(url);

    this.setState((prev) => {
      const documents = options?.prepend
        ? [document, ...prev.documents]
        : [...prev.documents, document];
      const activeId = options?.setActive === false ? (prev.activeId ?? document.id) : document.id;

      return {
        ...prev,
        documents,
        activeId,
      } satisfies ViewerState;
    });

    this.markDocumentLoading(document.id);

    return { success: true };
  }

  addDocumentFromFile(file: File, options?: { setActive?: boolean }): LoadResult {
    if (!(file instanceof File)) {
      const error = 'Arquivo inválido fornecido.';
      return { success: false, error };
    }

    const document = buildDocumentFromFile(file);

    this.setState((prev) => {
      const documents = [...prev.documents, document];
      const activeId = options?.setActive === false ? (prev.activeId ?? document.id) : document.id;

      return {
        ...prev,
        documents,
        activeId,
      } satisfies ViewerState;
    });

    this.markDocumentLoading(document.id);

    return { success: true };
  }

  setActiveDocument(id: string): void {
    if (!this.hasDocument(id) || this.snapshot.activeId === id) {
      return;
    }

    this.setState(
      (prev) =>
        ({
          ...prev,
          activeId: id,
        }) satisfies ViewerState,
    );

    const next = this.getActiveDocument();
    if (next && next.status === 'idle') {
      this.markDocumentLoading(next.id);
    }
  }

  closeDocument(id: string): void {
    if (!this.hasDocument(id)) {
      return;
    }

    this.setState((prev) => {
      const index = prev.documents.findIndex((doc) => doc.id === id);
      const documents = prev.documents.filter((doc) => doc.id !== id);

      let activeId = prev.activeId;
      if (prev.activeId === id) {
        const fallback = documents[index] ?? documents[index - 1] ?? documents[0] ?? null;
        activeId = fallback?.id ?? null;
      }

      return {
        ...prev,
        documents,
        activeId,
      } satisfies ViewerState;
    });
  }

  markDocumentLoading(id: string): void {
    this.updateDocument(id, (doc) => ({
      ...doc,
      status: 'loading',
      error: null,
      lastUpdatedAt: Date.now(),
    }));
  }

  markDocumentReady(id: string, info?: { pageCount?: number }): void {
    this.updateDocument(id, (doc) => ({
      ...doc,
      status: 'ready',
      error: null,
      pageCount: info?.pageCount ?? doc.pageCount,
    }));
  }

  markDocumentError(id: string, message: string): void {
    this.updateDocument(id, (doc) => ({
      ...doc,
      status: 'error',
      error: message,
    }));
  }

  reset(): void {
    this.stateSubject.next(createInitialViewerState());
    this.lastExternalCombinationKey = null;
  }

  selectDocuments$(): Observable<ViewerDocument[]> {
    return this.state$.pipe(
      map((state) => state.documents),
      distinctUntilChanged(),
    );
  }

  selectActiveDocument$(): Observable<ViewerDocument | null> {
    return this.state$.pipe(
      map((state) => state.documents.find((doc) => doc.id === state.activeId) ?? null),
      distinctUntilChanged(),
    );
  }

  selectStatus$(): Observable<ViewerStatus> {
    return this.state$.pipe(
      map((state) => state.status),
      distinctUntilChanged(),
    );
  }

  private updateDocument(id: string, updater: (doc: ViewerDocument) => ViewerDocument): void {
    if (!this.hasDocument(id)) {
      return;
    }

    this.setState((prev) => {
      const documents = prev.documents.map((doc) => (doc.id === id ? updater(doc) : doc));

      return {
        ...prev,
        documents,
      } satisfies ViewerState;
    });
  }

  private setState(updater: (prev: ViewerState) => ViewerState): void {
    const current = this.snapshot;
    const updated = this.recalculateDerivedState(updater(current));
    this.stateSubject.next(updated);
    this.updateExternalCombinationKey(updated);
  }

  private recalculateDerivedState(state: ViewerState): ViewerState {
    let activeId = state.activeId;
    const hasActive = activeId && state.documents.some((doc) => doc.id === activeId);
    if (!hasActive) {
      activeId = state.documents[0]?.id ?? null;
    }

    const activeDocument = state.documents.find((doc) => doc.id === activeId) ?? null;

    let status: ViewerStatus = 'idle';
    let error: string | null = null;

    if (activeDocument) {
      status = activeDocument.status === 'idle' ? 'loading' : activeDocument.status;
      error = activeDocument.status === 'error' ? activeDocument.error : null;
    } else {
      status = 'idle';
      error = null;
    }

    return {
      ...state,
      activeId,
      status,
      error,
    } satisfies ViewerState;
  }

  private updateExternalCombinationKey(state: ViewerState = this.snapshot): void {
    const urls = state.documents
      .filter((doc) => doc.sourceType === 'url' && doc.url)
      .map((doc) => doc.url!);
    this.lastExternalCombinationKey = urls.length ? this.buildCombinationKey(urls) : null;
  }

  private hasDocument(id: string): boolean {
    return this.snapshot.documents.some((doc) => doc.id === id);
  }

  private getActiveDocument(): ViewerDocument | null {
    return this.snapshot.documents.find((doc) => doc.id === this.snapshot.activeId) ?? null;
  }

  private normalizeUrls(urls: string[]): string[] {
    const seen = new Set<string>();
    const normalized: string[] = [];

    for (const url of urls) {
      const candidate = url.trim();
      const { baseUrl } = parseUrlWithFragment(candidate);
      
      if (!candidate || !isValidPdfUrl(baseUrl) || seen.has(candidate)) {
        continue;
      }
      
      seen.add(candidate); // Adicionar URL completa (com fragmento)
      normalized.push(candidate);
    }

    return normalized;
  }

  updateDocumentState(docId: string, state: {
    page?: number;
    zoom?: string | number;
    scrollY?: number;
    cachedBlobUrl?: string;
  }): void {
    this.updateDocument(docId, (doc) => ({
      ...doc,
      lastViewedPage: state.page ?? doc.lastViewedPage,
      lastZoomLevel: state.zoom ?? doc.lastZoomLevel,
      lastScrollY: state.scrollY ?? doc.lastScrollY,
      cachedBlobUrl: state.cachedBlobUrl ?? doc.cachedBlobUrl,
    }));
  }

  private buildCombinationKey(urls: string[]): string {
    return urls.join('||');
  }
}
