import { Directive, HostListener } from '@angular/core';

import { PdfViewerStore } from '../pdf-viewer.store';

@Directive({
  selector: '[appPdfSwipeGesture]',
  standalone: true
})
export class PdfSwipeGestureDirective {
  constructor(private readonly store: PdfViewerStore) {}

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    this.store.onTouchStart(event);
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent): void {
    this.store.onTouchMove(event);
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent): void {
    this.store.onTouchEnd(event);
  }
}
