import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

import { isValidHttpUrl } from '../utils/url.utils';
import {
  buildDocumentFromFile,
  buildDocumentFromUrl,
  createInitialViewerState,
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

  loadFromUrl(rawUrl: string): LoadResult {
    const url = rawUrl?.trim();
    if (!isValidHttpUrl(url)) {
      const error = 'URL inválida. Certifique-se de incluir http:// ou https://';
      this.setErrorState(error);
      return { success: false, error };
    }

    this.setLoadingState(buildDocumentFromUrl(url));
    return { success: true };
  }

  loadFromFile(file: File): LoadResult {
    if (!(file instanceof File)) {
      const error = 'Arquivo inválido fornecido.';
      this.setErrorState(error);
      return { success: false, error };
    }

    this.setLoadingState(buildDocumentFromFile(file));
    return { success: true };
  }

  markReady(): void {
    this.updateState({
      status: 'ready',
      error: null,
    });
  }

  markError(errorMessage: string): void {
    this.updateState({
      status: 'error',
      error: errorMessage,
    });
  }

  reset(): void {
    this.stateSubject.next(createInitialViewerState());
  }

  selectDocument$(): Observable<ViewerDocument | null> {
    return this.state$.pipe(
      map((state) => state.document),
      distinctUntilChanged(),
    );
  }

  selectStatus$(): Observable<ViewerStatus> {
    return this.state$.pipe(
      map((state) => state.status),
      distinctUntilChanged(),
    );
  }

  private setLoadingState(document: ViewerDocument): void {
    this.stateSubject.next({
      status: 'loading',
      error: null,
      document,
    });
  }

  private setErrorState(error: string): void {
    this.stateSubject.next({
      status: 'error',
      error,
      document: null,
    });
  }

  private updateState(partial: Partial<ViewerState>): void {
    const current = this.stateSubject.value;
    this.stateSubject.next({
      ...current,
      ...partial,
    });
  }
}
