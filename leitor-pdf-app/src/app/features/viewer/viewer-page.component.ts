import { NgFor, NgIf } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  OnDestroy,
  Signal,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  NgxExtendedPdfViewerModule,
  PdfLoadedEvent,
  ScrollModeType,
} from 'ngx-extended-pdf-viewer';

import { ViewerStateService } from '../../core/viewer/viewer-state.service';
import { ViewerDocument } from '../../core/viewer/viewer-state.model';
import { createInitialViewerState } from '../../core/viewer/viewer-state.util';
import { DocumentCarouselComponent } from './document-carousel.component';

@Component({
  selector: 'app-viewer-page',
  standalone: true,
  imports: [NgIf, NgFor, NgxExtendedPdfViewerModule, DocumentCarouselComponent],
  templateUrl: './viewer-page.component.html',
  styleUrl: './viewer-page.component.scss',
})
export class ViewerPageComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly viewerState = inject(ViewerStateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);

  @ViewChild('pdfViewer', { read: ElementRef })
  private pdfViewerRef?: ElementRef<HTMLElement>;

  private readonly paramSyncSuppressed = signal(false);

  protected currentPage = 1;
  protected totalPages = 0;
  protected readonly pageScrollMode = ScrollModeType.page;

  protected readonly state = toSignal(this.viewerState.state$, {
    initialValue: createInitialViewerState(),
  });

  protected readonly documents: Signal<ViewerDocument[]> = computed(() => this.state().documents);

  protected readonly activeDocument: Signal<ViewerDocument | null> = computed(() => {
    const currentState = this.state();
    return currentState.documents.find((doc) => doc.id === currentState.activeId) ?? null;
  });

  protected readonly backgroundDocuments: Signal<ViewerDocument[]> = computed(() => {
    const current = this.state();
    return current.documents.filter(
      (doc) => doc.id !== current.activeId && doc.sourceType === 'url' && doc.status !== 'ready',
    );
  });

  protected readonly isLoading: Signal<boolean> = computed(() => this.state().status === 'loading');

  protected readonly hasError: Signal<boolean> = computed(
    () => this.state().status === 'error' && Boolean(this.state().error),
  );

  protected readonly activeError: Signal<string | null> = computed(() => this.state().error);

  protected readonly hasDocuments: Signal<boolean> = computed(() => this.documents().length > 0);

  private tapZoneObserver?: MutationObserver;

  constructor() {
    this.watchQueryParams();
    this.prefetchBackgroundDocuments();
    this.resetPaginationOnDocumentChange();
  }

  protected retry(): void {
    const doc = this.activeDocument();
    if (!doc) {
      return;
    }

    if (doc.sourceType === 'url') {
      this.viewerState.markDocumentLoading(doc.id);
      this.viewerState.addDocumentFromUrl(doc.url ?? '', { setActive: true });
      this.syncQueryParams();
      return;
    }

    // Para arquivos locais, redefinimos o estado para permitir nova tentativa manual.
    this.viewerState.markDocumentLoading(doc.id);
  }

  protected clearError(): void {
    const doc = this.activeDocument();
    if (!doc) {
      return;
    }

    this.viewerState.markDocumentLoading(doc.id);
  }

  protected onDocumentSelected(documentId: string): void {
    this.viewerState.setActiveDocument(documentId);
    this.syncQueryParams();
  }

  protected onDocumentClosed(documentId: string): void {
    this.viewerState.closeDocument(documentId);
    this.syncQueryParams();
  }

  protected onPdfLoaded(docId: string, event: PdfLoadedEvent): void {
    this.viewerState.markDocumentReady(docId, { pageCount: event.pagesCount });
    const rawPagesCount: unknown = (event as { pagesCount?: unknown }).pagesCount;
    const rawPageNumber: unknown = (event as { pageNumber?: unknown }).pageNumber;

    const totalPages = typeof rawPagesCount === 'number' ? rawPagesCount : this.totalPages;
    const pageNumber = typeof rawPageNumber === 'number' ? rawPageNumber : 1;

    this.totalPages = totalPages;
    this.currentPage = pageNumber;

    console.debug('[viewer] pdfLoaded', {
      docId,
      totalPages,
      pageNumber,
    });

    if (this.activeDocument()?.id === docId) {
      this.updatePageTapZones();
    }
  }

  protected onPdfLoadFailed(docId: string, event: unknown): void {
    const message = inferErrorMessage(event);
    this.viewerState.markDocumentError(docId, message);
  }

  protected onPageChange(page: number): void {
    console.debug('[viewer] pageChange emitted', { page });
    this.currentPage = page;
    this.updatePageTapZones();
  }

  protected getDocumentSource(doc: ViewerDocument): string | File {
    if (doc.sourceType === 'file') {
      return doc.file!;
    }

    return appendTimestampToUrl(doc.url ?? '', doc.lastUpdatedAt);
  }

  private syncQueryParams(): void {
    const remoteUrls = this.documents()
      .filter((doc) => doc.sourceType === 'url' && doc.url)
      .map((doc) => doc.url!);

    const activeDoc = this.activeDocument();
    const activeId =
      activeDoc && activeDoc.sourceType === 'url' && activeDoc.url ? activeDoc.id : null;

    const queryParams: Record<string, string | null> = {
      url: null,
      urls: remoteUrls.length ? remoteUrls.join('|') : null,
      active: activeId,
    };

    this.paramSyncSuppressed.set(true);
    void this.router
      .navigate([], {
        relativeTo: this.route,
        queryParams,
        queryParamsHandling: 'merge',
      })
      .finally(() => this.paramSyncSuppressed.set(false));
  }

  private watchQueryParams(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      if (this.paramSyncSuppressed()) {
        return;
      }

      const hasUrls = params.has('urls');
      const hasUrl = params.has('url');

      if (!hasUrls && !hasUrl) {
        return;
      }

      const urlsParam = params.get('urls');
      const fallbackUrl = params.get('url');
      const activeId = params.get('active');

      const urls = parseUrlsParam(urlsParam, fallbackUrl);

      if (!urls.length) {
        this.viewerState.applyExternalSources([], null);
        return;
      }

      this.viewerState.applyExternalSources(urls, activeId);
    });
  }

  protected onCornerTap(position: 'left' | 'right'): void {
    if (position === 'right') {
      this.goToNextPage();
    } else {
      this.goToPreviousPage();
    }
  }

  private prefetchBackgroundDocuments(): void {
    effect(() => {
      const docs = this.state();
      docs.documents.forEach((doc) => {
        if (doc.id === docs.activeId) {
          return;
        }

        if (doc.sourceType === 'url' && doc.status === 'idle') {
          this.viewerState.markDocumentLoading(doc.id);
        }
      });
    });
  }

  private resetPaginationOnDocumentChange(): void {
    effect(() => {
      const doc = this.activeDocument();
      if (!doc) {
        this.currentPage = 1;
        this.totalPages = 0;
        return;
      }

      this.currentPage = 1;
      this.totalPages = doc.pageCount ?? 0;
      this.updatePageTapZones();
    });
  }

  private updatePageTapZones(): void {
    requestAnimationFrame(() => {
      const host = this.pdfViewerRef?.nativeElement;
      if (!host) {
        return;
      }

      this.initTapZoneObserver(host);

      const wrappers = host.querySelectorAll<HTMLElement>('.canvasWrapper');
      wrappers.forEach((wrapper) => this.ensurePageTapZones(wrapper));
    });
  }

  private ensurePageTapZones(wrapper: HTMLElement): void {
    if (getComputedStyle(wrapper).position === 'static') {
      wrapper.style.position = 'relative';
    }

    const existingZones = Array.from(
      wrapper.querySelectorAll<HTMLElement>('[data-viewer-page-tap-zone="true"]'),
    );

    if (!existingZones.length) {
      this.createPageTapZone(wrapper, 'left', 'top');
      this.createPageTapZone(wrapper, 'left', 'bottom');
      this.createPageTapZone(wrapper, 'right', 'top');
      this.createPageTapZone(wrapper, 'right', 'bottom');
      wrapper.dataset['viewerTapZones'] = 'true';
    } else {
      existingZones.forEach((zone) => this.applyTapZoneStyles(wrapper, zone));
    }
  }

  private createPageTapZone(
    wrapper: HTMLElement,
    horizontal: 'left' | 'right',
    vertical: 'top' | 'bottom',
  ): void {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `viewer__page-tap-zone viewer__page-tap-zone--${horizontal} viewer__page-tap-zone--${vertical}`;
    button.setAttribute('data-viewer-page-tap-zone', 'true');
    button.setAttribute('aria-label', horizontal === 'right' ? 'Avancar pagina' : 'Voltar pagina');
    button.dataset['viewerTapZoneHorizontal'] = horizontal;
    button.dataset['viewerTapZoneVertical'] = vertical;

    button.addEventListener('click', () => {
      this.ngZone.run(() => this.onCornerTap(horizontal));
    });

    this.applyTapZoneStyles(wrapper, button);
    wrapper.appendChild(button);
  }

  private applyTapZoneStyles(wrapper: HTMLElement, zone: HTMLElement): void {
    const rect = wrapper.getBoundingClientRect();
    const width = Math.max(rect.width * 0.28, 120);
    const height = Math.max(rect.height * 0.28, 120);

    zone.style.position = 'absolute';
    zone.style.width = `${width}px`;
    zone.style.height = `${height}px`;
    zone.style.minWidth = `${width}px`;
    zone.style.minHeight = `${height}px`;
    zone.style.border = 'none';
    zone.style.background = 'transparent';
    zone.style.padding = '0';
    zone.style.cursor = 'pointer';
    zone.style.zIndex = '2';

    const horizontal = zone.dataset['viewerTapZoneHorizontal'] as 'left' | 'right' | undefined;
    const vertical = zone.dataset['viewerTapZoneVertical'] as 'top' | 'bottom' | undefined;

    if (horizontal === 'left') {
      zone.style.left = '0';
      zone.style.right = '';
    } else if (horizontal === 'right') {
      zone.style.right = '0';
      zone.style.left = '';
    }

    if (vertical === 'top') {
      zone.style.top = '0';
      zone.style.bottom = '';
    } else if (vertical === 'bottom') {
      zone.style.bottom = '0';
      zone.style.top = '';
    }
  }

  private initTapZoneObserver(host: HTMLElement): void {
    if (this.tapZoneObserver) {
      return;
    }

    this.tapZoneObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        Array.from(mutation.addedNodes).forEach((node) => {
          if (!(node instanceof HTMLElement)) {
            return;
          }

          if (node.matches('.canvasWrapper')) {
            this.ensurePageTapZones(node);
          }

          node.querySelectorAll<HTMLElement>('.canvasWrapper').forEach((wrapper) => {
            this.ensurePageTapZones(wrapper);
          });
        });

        if (mutation.type === 'attributes' && mutation.target instanceof HTMLElement) {
          if (mutation.target.matches('.canvasWrapper')) {
            this.ensurePageTapZones(mutation.target);
          }
        }
      });
    });

    this.tapZoneObserver.observe(host, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    });
  }

  private goToNextPage(): void {
    if (this.currentPage >= this.totalPages) {
      console.debug('[viewer] next page blocked', {
        currentPage: this.currentPage,
        totalPages: this.totalPages,
      });
      return;
    }

    this.currentPage += 1;
    console.debug('[viewer] next page', { page: this.currentPage });
  }

  private goToPreviousPage(): void {
    if (this.currentPage <= 1) {
      console.debug('[viewer] previous page blocked', {
        currentPage: this.currentPage,
      });
      return;
    }

    this.currentPage -= 1;
    console.debug('[viewer] previous page', { page: this.currentPage });
  }

  ngOnDestroy(): void {
    this.tapZoneObserver?.disconnect();
    this.tapZoneObserver = undefined;
  }
}

function parseUrlsParam(urlsParam: string | null, fallbackUrl: string | null): string[] {
  const values: string[] = [];

  if (urlsParam) {
    values.push(...urlsParam.split(/[|,]/));
  } else if (fallbackUrl) {
    values.push(fallbackUrl);
  }

  return values.map((value) => value.trim()).filter(Boolean);
}

function appendTimestampToUrl(url: string, timestamp: number): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('ts', String(timestamp));
    return parsed.toString();
  } catch {
    return url;
  }
}

function inferErrorMessage(event: unknown): string {
  if (typeof event === 'string') {
    return event;
  }

  if (
    event &&
    typeof event === 'object' &&
    'message' in event &&
    typeof (event as { message: unknown }).message === 'string'
  ) {
    return (event as { message: string }).message;
  }

  return 'Nao conseguimos carregar o PDF. Verifique se a URL esta acessivel e com permissoes CORS.';
}
