import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PdfViewerStore } from '../../pdf-viewer.store';

@Component({
  selector: 'app-pdf-controls-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pdf-controls-bar.component.html',
  styleUrls: ['./pdf-controls-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PdfControlsBarComponent {
  private readonly store = inject(PdfViewerStore);

  readonly currentPage = this.store.currentPage;
  readonly totalPages = this.store.totalPages;
  readonly scale = this.store.scale;
  readonly isAutoFitDifferent = this.store.isAutoFitDifferent;
  readonly autoFitScale = this.store.autoFitScale;

  readonly zoomPercent = computed(() => {
    const currentScale = this.scale();
    const autoFit = this.autoFitScale();

    if (!autoFit || autoFit <= 0) {
      return currentScale * 100;
    }

    return (currentScale / autoFit) * 100;
  });

  readonly canResetZoom = computed(() => {
    const autoFit = this.autoFitScale();
    if (!autoFit || autoFit <= 0) {
      return false;
    }
    return Math.abs(this.scale() - autoFit) > 0.01;
  });

  resetViewer(): void {
    this.store.resetViewer();
  }

  previousPage(): void {
    this.store.previousPage();
  }

  nextPage(): void {
    this.store.nextPage();
  }

  onZoomLevelClick(): void {
    if (!this.canResetZoom()) {
      return;
    }
    this.store.resetZoom();
  }

  onPageSubmit(event: Event): void {
    const input = event.target as HTMLInputElement;
    const pageNumber = parseInt(input.value, 10);

    if (Number.isNaN(pageNumber)) {
      input.value = this.currentPage().toString();
      return;
    }

    const validPage = Math.max(1, Math.min(pageNumber, this.totalPages()));
    input.value = validPage.toString();
    this.store.goToPage(validPage);
  }
}
