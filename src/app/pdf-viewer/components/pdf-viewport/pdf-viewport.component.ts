import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PdfSwipeGestureDirective } from '../../directives/pdf-swipe-gesture.directive';
import { PdfViewerStore } from '../../pdf-viewer.store';

@Component({
  selector: 'app-pdf-viewport',
  standalone: true,
  imports: [CommonModule, PdfSwipeGestureDirective],
  templateUrl: './pdf-viewport.component.html',
  styleUrls: ['./pdf-viewport.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PdfViewportComponent implements AfterViewInit, OnDestroy {
  @ViewChild('viewportContainer') viewportContainer!: ElementRef<HTMLDivElement>;

  readonly pageTransitionDirection: PdfViewerStore['pageTransitionDirection'];
  readonly isSwipingActive: PdfViewerStore['isSwipingActive'];
  readonly swipeOffset: PdfViewerStore['swipeOffset'];

  constructor(private readonly store: PdfViewerStore) {
    this.pageTransitionDirection = this.store.pageTransitionDirection;
    this.isSwipingActive = this.store.isSwipingActive;
    this.swipeOffset = this.store.swipeOffset;
  }

  ngAfterViewInit(): void {
    this.store.setPdfContainer(this.viewportContainer.nativeElement);
  }

  ngOnDestroy(): void {
    this.store.clearPdfContainer();
  }
}
