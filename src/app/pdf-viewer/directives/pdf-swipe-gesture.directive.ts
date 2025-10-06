import { Directive, HostListener } from '@angular/core';

import { PdfViewerStore } from '../pdf-viewer.store';

@Directive({
  selector: '[appPdfSwipeGesture]',
  standalone: true
})
export class PdfSwipeGestureDirective {
  constructor(private readonly store: PdfViewerStore) {}

  @HostListener('pointerdown', ['$event'])
  onPointerDown(event: PointerEvent): void {
    this.store.onPointerDown(event);
  }

  @HostListener('pointermove', ['$event'])
  onPointerMove(event: PointerEvent): void {
    this.store.onPointerMove(event);
  }

  @HostListener('pointerup', ['$event'])
  onPointerUp(event: PointerEvent): void {
    this.store.onPointerUp(event);
  }

  @HostListener('pointercancel', ['$event'])
  onPointerCancel(event: PointerEvent): void {
    this.store.onPointerCancel(event);
  }

  @HostListener('pointerleave', ['$event'])
  onPointerLeave(event: PointerEvent): void {
    this.store.onPointerCancel(event);
  }
}
