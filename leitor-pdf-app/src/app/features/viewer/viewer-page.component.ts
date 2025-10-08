import { NgIf } from '@angular/common';
import { Component, DestroyRef, Signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';

import { ViewerStateService } from '../../core/viewer/viewer-state.service';
import { createInitialViewerState } from '../../core/viewer/viewer-state.util';

@Component({
  selector: 'app-viewer-page',
  standalone: true,
  imports: [NgIf, FormsModule, NgxExtendedPdfViewerModule],
  templateUrl: './viewer-page.component.html',
  styleUrl: './viewer-page.component.scss',
})
export class ViewerPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly viewerState = inject(ViewerStateService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly state = toSignal(this.viewerState.state$, {
    initialValue: createInitialViewerState(),
  });

  protected readonly isLoading: Signal<boolean> = computed(() => this.state().status === 'loading');

  protected readonly hasError: Signal<boolean> = computed(
    () => this.state().status === 'error' && Boolean(this.state().error),
  );

  protected readonly document = computed(() => this.state().document);

  protected urlInput = '';

  private lastRequestedId: string | null = null;

  constructor() {
    this.watchQueryParams();
  }

  protected retry(): void {
    const document = this.state().document;
    if (!document) {
      return;
    }

    if (document.sourceType === 'url' && document.url) {
      this.loadUrl(document.url, { updateQueryParams: false });
    }
  }

  protected clearError(): void {
    this.viewerState.reset();
    this.lastRequestedId = null;
  }

  protected submitUrl(): void {
    const url = this.urlInput.trim();
    if (!url) {
      return;
    }

    this.loadUrl(url, { updateQueryParams: true });
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.item(0) ?? null;

    if (!file) {
      return;
    }

    const result = this.viewerState.loadFromFile(file);
    if (!result.success) {
      return;
    }

    this.urlInput = '';
    this.lastRequestedId = this.state().document?.id ?? null;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { url: null },
      queryParamsHandling: 'merge',
    });
    input.value = '';
  }

  protected onPdfLoaded(): void {
    this.viewerState.markReady();
  }

  protected onPdfLoadFailed(event: unknown): void {
    const message = inferErrorMessage(event);
    this.viewerState.markError(message);
  }

  private watchQueryParams(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const url = params.get('url');

      if (!url) {
        this.viewerState.reset();
        this.lastRequestedId = null;
        return;
      }

      if (this.lastRequestedId === url) {
        return;
      }

      const result = this.viewerState.loadFromUrl(url);
      if (result.success) {
        this.lastRequestedId = url;
        this.urlInput = url;
      } else {
        this.lastRequestedId = null;
      }
    });
  }

  private loadUrl(url: string, options: { updateQueryParams: boolean }): void {
    const result = this.viewerState.loadFromUrl(url);

    if (!result.success) {
      return;
    }

    this.lastRequestedId = url;
    this.urlInput = url;

    if (options.updateQueryParams) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { url },
        queryParamsHandling: 'merge',
      });
    }
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
    typeof event.message === 'string'
  ) {
    return event.message;
  }

  return 'Não conseguimos carregar o PDF. Verifique se a URL está acessível e com permissões CORS.';
}
