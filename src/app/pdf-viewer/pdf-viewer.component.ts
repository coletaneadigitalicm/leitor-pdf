import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

import { PdfControlsBarComponent } from './components/pdf-controls-bar/pdf-controls-bar.component';
import { PdfDocumentTabsComponent } from './components/pdf-document-tabs/pdf-document-tabs.component';
import { PdfViewerStore } from './pdf-viewer.store';

@Component({
  selector: 'app-pdf-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule, PdfControlsBarComponent, PdfDocumentTabsComponent],
  templateUrl: './pdf-viewer.component.html',
  styleUrls: ['./pdf-viewer.component.scss'],
  providers: [PdfViewerStore]
})
export class PdfViewerComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('pdfContainer') pdfContainer!: ElementRef<HTMLDivElement>;

  readonly pdfDocuments: PdfViewerStore['pdfDocuments'];
  readonly activeDocumentIndex: PdfViewerStore['activeDocumentIndex'];
  readonly activeDocument: PdfViewerStore['activeDocument'];
  readonly hasMultipleDocs: PdfViewerStore['hasMultipleDocs'];
  readonly currentPage: PdfViewerStore['currentPage'];
  readonly totalPages: PdfViewerStore['totalPages'];
  readonly scale: PdfViewerStore['scale'];
  readonly autoFitScale: PdfViewerStore['autoFitScale'];
  readonly isAutoFitDifferent: PdfViewerStore['isAutoFitDifferent'];
  readonly pdfUrl: PdfViewerStore['pdfUrl'];
  readonly isLoading: PdfViewerStore['isLoading'];
  readonly errorMessage: PdfViewerStore['errorMessage'];
  readonly isDragging: PdfViewerStore['isDragging'];
  readonly pdfLoaded: PdfViewerStore['pdfLoaded'];
  readonly showInstructions: PdfViewerStore['showInstructions'];
  readonly pageTransitionDirection: PdfViewerStore['pageTransitionDirection'];
  readonly isOverflowing: PdfViewerStore['isOverflowing'];
  readonly swipeOffset: PdfViewerStore['swipeOffset'];
  readonly isSwipingActive: PdfViewerStore['isSwipingActive'];

  private queryParamsSub?: Subscription;
  private readonly popStateHandler = () => {
    this.store.checkUrlParameter();
  };
  private readonly resizeHandler = () => {
    this.store.onWindowResize();
  };
  private readonly dpiChangeHandler = () => {
    this.store.onDpiChange();
  };
  private dpiMediaQuery?: MediaQueryList;

  constructor(private route: ActivatedRoute, public store: PdfViewerStore) {
    this.pdfDocuments = this.store.pdfDocuments;
    this.activeDocumentIndex = this.store.activeDocumentIndex;
    this.activeDocument = this.store.activeDocument;
    this.hasMultipleDocs = this.store.hasMultipleDocs;
    this.currentPage = this.store.currentPage;
    this.totalPages = this.store.totalPages;
    this.scale = this.store.scale;
    this.autoFitScale = this.store.autoFitScale;
    this.isAutoFitDifferent = this.store.isAutoFitDifferent;
    this.pdfUrl = this.store.pdfUrl;
    this.isLoading = this.store.isLoading;
    this.errorMessage = this.store.errorMessage;
    this.isDragging = this.store.isDragging;
    this.pdfLoaded = this.store.pdfLoaded;
    this.showInstructions = this.store.showInstructions;
    this.pageTransitionDirection = this.store.pageTransitionDirection;
    this.isOverflowing = this.store.isOverflowing;
    this.swipeOffset = this.store.swipeOffset;
    this.isSwipingActive = this.store.isSwipingActive;
  }

  async ngOnInit(): Promise<void> {
    await this.store.init();

    await this.store.checkUrlParameter();

    this.queryParamsSub = this.route.queryParams.subscribe(() => {
      this.store.checkUrlParameter();
    });

    window.addEventListener('popstate', this.popStateHandler);
    window.addEventListener('resize', this.resizeHandler);

    this.dpiMediaQuery = window.matchMedia(`(resolution: ${this.store.getDevicePixelRatio()}dppx)`);
    this.dpiMediaQuery.addEventListener('change', this.dpiChangeHandler);
  }

  ngAfterViewInit(): void {
    if (this.pdfContainer) {
      this.store.setPdfContainer(this.pdfContainer.nativeElement);
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('popstate', this.popStateHandler);
    window.removeEventListener('resize', this.resizeHandler);

    if (this.dpiMediaQuery) {
      this.dpiMediaQuery.removeEventListener('change', this.dpiChangeHandler);
    }

    if (this.queryParamsSub) {
      this.queryParamsSub.unsubscribe();
    }

    this.store.destroy();
  }

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.store.setDragging(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.store.setDragging(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.store.setDragging(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.store.handleMultipleFileUpload(files);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.store.handleMultipleFileUpload(input.files);
    }
  }

  async loadPdfFromUrl(): Promise<void> {
    await this.store.loadPdfFromUrl();
  }

  async loadPdfFromData(data: ArrayBuffer, fileName: string = 'Documento'): Promise<void> {
    await this.store.loadPdfFromData(data, fileName);
  }

  onTouchStart(event: TouchEvent): void {
    this.store.onTouchStart(event);
  }

  onTouchMove(event: TouchEvent): void {
    this.store.onTouchMove(event);
  }

  onTouchEnd(event: TouchEvent): void {
    this.store.onTouchEnd(event);
  }

  onKeyDown(event: KeyboardEvent): void {
    this.store.onKeyDown(event);
  }

  async handleFileUpload(file: File): Promise<void> {
    const fileList = new DataTransfer();
    fileList.items.add(file);
    await this.store.handleMultipleFileUpload(fileList.files);
  }
}
