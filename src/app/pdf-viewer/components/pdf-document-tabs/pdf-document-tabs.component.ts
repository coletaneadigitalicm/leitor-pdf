import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PdfViewerStore } from '../../pdf-viewer.store';

@Component({
  selector: 'app-pdf-document-tabs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pdf-document-tabs.component.html',
  styleUrls: ['./pdf-document-tabs.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PdfDocumentTabsComponent {
  private readonly store = inject(PdfViewerStore);

  readonly pdfDocuments = this.store.pdfDocuments;
  readonly activeDocumentIndex = this.store.activeDocumentIndex;

  switchTo(index: number): void {
    this.store.switchToDocument(index);
  }
}
