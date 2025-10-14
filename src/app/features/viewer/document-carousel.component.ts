import { NgClass, NgFor, NgIf } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
  ElementRef,
} from '@angular/core';

import { ViewerDocument } from '../../core/viewer/viewer-state.model';

@Component({
  selector: 'app-document-carousel',
  standalone: true,
  imports: [NgFor, NgClass, NgIf],
  templateUrl: './document-carousel.component.html',
  styleUrl: './document-carousel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentCarouselComponent {
  @Input({ required: true }) documents: ViewerDocument[] = [];
  @Input() activeId: string | null = null;
  @Output() selectDocument = new EventEmitter<string>();
  @Output() closeDocument = new EventEmitter<string>();

  @ViewChild('track', { static: true }) private readonly track?: ElementRef<HTMLElement>;

  protected trackById(index: number, document: ViewerDocument): string {
    return document.id;
  }

  protected isActive(document: ViewerDocument): boolean {
    return document.id === this.activeId;
  }

  protected onSelect(document: ViewerDocument): void {
    this.selectDocument.emit(document.id);
  }

  protected onClose(document: ViewerDocument, event: MouseEvent): void {
    event.stopPropagation();
    this.closeDocument.emit(document.id);
  }

  protected getStatus(document: ViewerDocument): 'loading' | 'ready' | 'error' | 'idle' {
    return document.status;
  }

  protected getOriginLabel(document: ViewerDocument): string {
    return document.sourceType === 'url' ? 'URL' : 'Local';
  }

  protected onKeydown(document: ViewerDocument, event: KeyboardEvent): void {
    if (event.code === 'Enter' || event.code === 'Space') {
      event.preventDefault();
      this.onSelect(document);
    }
  }

  @HostListener('wheel', ['$event'])
  onWheel(event: WheelEvent): void {
    if (!this.track) {
      return;
    }

    if (Math.abs(event.deltaX) < Math.abs(event.deltaY)) {
      this.track.nativeElement.scrollBy({
        left: event.deltaY * 0.6,
        behavior: 'smooth',
      });
      event.preventDefault();
    }
  }
}
