import { Injectable, signal, computed } from '@angular/core';

import { PdfRendererService } from './services/pdf-renderer.service';
import { PdfUrlParser } from './utils/pdf-url-parser';
import { PdfAutoFitCalculator } from './utils/pdf-auto-fit-calculator';

interface PointerInfo {
  x: number;
  y: number;
  pointerType: string;
}

interface PinchViewportFocus {
  pdfX: number;
  pdfY: number;
  pdfWidth: number;
  pdfHeight: number;
  pdfXRatio: number;
  pdfYRatio: number;
  viewportOffsetX: number;
  viewportOffsetY: number;
  viewportOffsetXRatio: number;
  viewportOffsetYRatio: number;
}

export interface PdfDocument {
  id: string;
  url: string;
  name: string;
  doc: any;
  totalPages: number;
  isLoaded: boolean;
  isLoading: boolean;
  error?: string;
  file?: File;
  initialPage?: number;
  hasBeenViewed?: boolean;
}

@Injectable()
export class PdfViewerStore {
  readonly pdfDocuments = signal<PdfDocument[]>([]);
  readonly activeDocumentIndex = signal(0);
  readonly activeDocument = computed(() => this.pdfDocuments()[this.activeDocumentIndex()] || null);
  readonly hasMultipleDocs = computed(() => this.pdfDocuments().length > 1);

  readonly currentPage = signal(1);
  readonly totalPages = signal(0);
  readonly scale = signal(1.0);
  readonly autoFitScale = signal<number | null>(null);
  readonly isAutoFitDifferent = computed(() => {
    const autoFit = this.autoFitScale();
    const current = this.scale();
    if (autoFit === null) return false;
    return Math.abs(current - autoFit) > 0.01;
  });

  readonly pdfUrl = signal('');
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly isDragging = signal(false);
  readonly pdfLoaded = signal(false);
  readonly showInstructions = signal(false);
  readonly pageTransitionDirection = signal<'forward' | 'backward' | 'none'>('none');
  readonly isOverflowing = signal(false);
  readonly swipeOffset = signal(0);
  readonly isSwipingActive = signal(false);

  private touchStartX = 0;
  private touchStartY = 0;
  private touchStartTime = 0;
  private instructionsTimeout?: number;
  private pdfjsReady: Promise<void>;
  private lastLoadedUrl = '';
  private resizeTimeout?: number;
  private devicePixelRatio = 1;
  private pdfContainer?: HTMLDivElement;
  private pendingRender: { pageNumber: number; applyAutoFit: boolean } | null = null;
  private currentCanvas?: HTMLCanvasElement;
  private lastRenderedScale = 1;
  private previousTouchAction = '';

  private readonly MIN_SCALE = 0.5;
  private readonly MAX_SCALE = 9.0;

  private activePointers = new Map<number, PointerInfo>();
  private isPinching = false;
  private pinchInitialDistance = 0;
  private pinchInitialScale = 1;
  private lastScrollDebugLog = 0;
  private pinchLastCenter: { x: number; y: number } | null = null;
  private pinchCurrentFocus: PinchViewportFocus | null = null;
  private pendingPinchViewportFocus: PinchViewportFocus | null = null;
  private pinchStartTime = 0;

  constructor(private readonly renderer: PdfRendererService) {
    this.pdfjsReady = this.renderer.getPdfJsReady();
    this.devicePixelRatio = this.renderer.devicePixelRatio();
    console.log('[PDF Viewer] Device Pixel Ratio detected:', this.devicePixelRatio);
  }

  getDevicePixelRatio(): number {
    return this.devicePixelRatio;
  }

  async init(): Promise<void> {
    await this.pdfjsReady;
  }

  destroy(): void {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    if (this.instructionsTimeout) {
      clearTimeout(this.instructionsTimeout);
    }
    this.pdfContainer = undefined;
    this.pendingRender = null;
    this.currentCanvas = undefined;
    this.activePointers.clear();
    this.isPinching = false;
    this.lastRenderedScale = 1;
    this.pinchLastCenter = null;
    this.pinchCurrentFocus = null;
    this.pendingPinchViewportFocus = null;
    this.pinchStartTime = 0;
  }

  setPdfContainer(container: HTMLDivElement): void {
    this.pdfContainer = container;

    if (this.pendingRender) {
      const { pageNumber, applyAutoFit } = this.pendingRender;
      this.pendingRender = null;
      void this.renderPage(pageNumber, applyAutoFit);
      return;
    }

    if (this.pdfLoaded() && this.activeDocument()?.doc) {
      void this.renderPage(this.currentPage());
    }
  }

  clearPdfContainer(): void {
    this.pdfContainer = undefined;
    this.pendingRender = null;
  }

  resetViewer(): void {
    this.pdfDocuments.set([]);
    this.activeDocumentIndex.set(0);
    this.currentPage.set(1);
    this.totalPages.set(0);
    this.scale.set(1.0);
    this.autoFitScale.set(null);
    this.pdfUrl.set('');
    this.errorMessage.set('');
    this.pdfLoaded.set(false);
    this.showInstructions.set(false);
    this.pageTransitionDirection.set('none');
    this.isOverflowing.set(false);
    this.swipeOffset.set(0);
    this.isSwipingActive.set(false);
    this.pendingRender = null;
    this.lastLoadedUrl = '';
  }

  async onWindowResize(): Promise<void> {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    this.resizeTimeout = window.setTimeout(() => {
      this.handleResize();
    }, 300);
  }

  private async handleResize() {
    const doc = this.activeDocument();
    if (!doc || !doc.doc || !this.pdfLoaded()) {
      return;
    }

    console.log('[PDF Viewer] Window resized, re-calculating fit-to-width...');

    try {
      await this.renderPage(this.currentPage(), true);
      console.log('[PDF Viewer] Page re-rendered after resize');
    } catch (error) {
      console.error('[PDF Viewer] Error handling resize:', error);
    }
  }

  onDpiChange(): void {
    const newDpi = window.devicePixelRatio || 1;
    if (newDpi !== this.devicePixelRatio) {
      console.log('[PDF Viewer] Device Pixel Ratio changed:', this.devicePixelRatio, '->', newDpi);
      this.devicePixelRatio = newDpi;
      this.renderer.setDevicePixelRatio(newDpi);
      this.handleResize();
    }
  }

  async checkUrlParameter(): Promise<void> {
    await this.pdfjsReady;

    const fullUrl = window.location.href;
    const urlParams = new URLSearchParams(window.location.search);
    const urlParam = urlParams.get('url');
    const urlsParam = urlParams.get('urls');

    if (urlsParam) {
      const urls = urlsParam.split(/[,|]/).map((u: string) => u.trim()).filter((u: string) => u);
      const urlsKey = urls.join('|');
      if (urlsKey !== this.lastLoadedUrl) {
        console.log('[PDF Viewer] Multiple URLs detected:', urls.length);
        this.lastLoadedUrl = urlsKey;
        await this.loadMultiplePdfs(urls);
      }
    } else if (urlParam) {
      let decodedUrl = decodeURIComponent(urlParam);
      const pageUrlMatch = fullUrl.match(/[?&]url=([^&]*)/);
      if (pageUrlMatch && pageUrlMatch[1]) {
        decodedUrl = decodeURIComponent(pageUrlMatch[1]);
      }
      if (decodedUrl !== this.lastLoadedUrl) {
        console.log('[PDF Viewer] Single URL detected:', decodedUrl);
        this.lastLoadedUrl = decodedUrl;
        await this.loadMultiplePdfs([decodedUrl]);
      }
    } else {
      if (this.lastLoadedUrl !== '') {
        console.log('[PDF Viewer] No query param found, showing upload screen');
        this.lastLoadedUrl = '';
        this.pdfDocuments.set([]);
        this.pdfLoaded.set(false);
      }
    }
  }

  async loadMultiplePdfs(urls: string[]): Promise<void> {
    if (urls.length === 0) return;

    await this.pdfjsReady;

    const docs: PdfDocument[] = urls.map((url, index) => {
      const initialPage = PdfUrlParser.extractPageFromUrl(url);
      const cleanUrl = url.split('#')[0];

      return {
        id: `pdf-${index}-${Date.now()}`,
        url: cleanUrl,
        name: PdfUrlParser.extractFileName(url, index),
        doc: null,
        totalPages: 0,
        isLoaded: false,
        isLoading: false,
        error: undefined,
        initialPage
      };
    });

    this.pdfDocuments.set(docs);
    this.pdfLoaded.set(true);
    this.showInstructionsTemporarily();

    console.log('[PDF Viewer] Loading first PDF...');
    await this.loadPdfDocument(0);

    if (docs.length > 1) {
      console.log('[PDF Viewer] Loading remaining PDFs in background...');
      this.loadRemainingPdfsInBackground();
    }
  }

  private async loadRemainingPdfsInBackground(): Promise<void> {
    const docs = this.pdfDocuments();
    const loadPromises = [];

    for (let i = 1; i < docs.length; i++) {
      loadPromises.push(this.loadPdfDocument(i));
    }

    await Promise.allSettled(loadPromises);
    console.log('[PDF Viewer] All PDFs loaded');
  }

  async loadPdfDocument(index: number): Promise<void> {
    const docs = this.pdfDocuments();
    if (index < 0 || index >= docs.length) return;

    const doc = docs[index];
    if (doc.isLoaded || doc.isLoading) return;

    this.pdfDocuments.update(currentDocs => {
      const newDocs = [...currentDocs];
      newDocs[index] = { ...newDocs[index], isLoading: true };
      return newDocs;
    });

    try {
      console.log(`[PDF Viewer] Loading PDF ${index + 1}/${docs.length}:`, doc.url);
      console.log('[PDF Viewer] Using progressive loading (Range Requests)');

      const pdfDoc = await this.renderer.loadDocumentFromUrl(doc.url, {
        onProgress: (progressData: any) => {
          if (progressData.total > 0) {
            const percent = Math.round((progressData.loaded / progressData.total) * 100);
            console.log(`[PDF Viewer] Download progress: ${percent}% (${progressData.loaded}/${progressData.total} bytes)`);
          }
        }
      });

      this.pdfDocuments.update(currentDocs => {
        const newDocs = [...currentDocs];
        newDocs[index] = {
          ...newDocs[index],
          doc: pdfDoc,
          totalPages: pdfDoc.numPages,
          isLoaded: true,
          isLoading: false,
          error: undefined,
          hasBeenViewed: this.activeDocumentIndex() === index
        };
        return newDocs;
      });

      if (this.activeDocumentIndex() === index) {
        this.totalPages.set(pdfDoc.numPages);
        const startPage = doc.initialPage && doc.initialPage > 0 && doc.initialPage <= pdfDoc.numPages
          ? doc.initialPage
          : 1;

        if (startPage !== 1) {
          console.log(`[PDF Viewer] Opening PDF at page ${startPage} (from URL hash)`);
        }

        this.currentPage.set(startPage);
        await this.renderPage(startPage, true);
      }

      console.log(`[PDF Viewer] PDF ${index + 1} loaded successfully:`, pdfDoc.numPages, 'pages');
    } catch (error) {
      console.error(`[PDF Viewer] Error loading PDF ${index + 1}:`, error);

      this.pdfDocuments.update(currentDocs => {
        const newDocs = [...currentDocs];
        newDocs[index] = {
          ...newDocs[index],
          isLoading: false,
          isLoaded: false,
          error: 'Erro ao carregar PDF'
        };
        return newDocs;
      });

      if (index === 0) {
        this.errorMessage.set('Erro ao carregar o primeiro PDF. Verifique a URL.');
      }
    }
  }

  switchToDocument(index: number): void {
    if (index < 0 || index >= this.pdfDocuments().length) return;
    if (index === this.activeDocumentIndex()) return;

    console.log(`[PDF Viewer] Switching to document ${index + 1}`);

    this.activeDocumentIndex.set(index);

    const doc = this.activeDocument();
    if (doc && doc.isLoaded) {
      this.totalPages.set(doc.totalPages);

      const startPage = doc.initialPage && doc.initialPage > 0 && doc.initialPage <= doc.totalPages
        ? doc.initialPage
        : 1;

      this.currentPage.set(startPage);

      const shouldAutoFit = !doc.hasBeenViewed;

      if (shouldAutoFit) {
        this.pdfDocuments.update(docs => {
          const newDocs = [...docs];
          newDocs[index] = { ...newDocs[index], hasBeenViewed: true };
          return newDocs;
        });
      }

      this.renderPage(startPage, shouldAutoFit);
    } else if (doc && !doc.isLoading) {
      this.loadPdfDocument(index);
    }
  }

  private showInstructionsTemporarily() {
    if (this.instructionsTimeout) {
      clearTimeout(this.instructionsTimeout);
    }

    this.showInstructions.set(true);

    this.instructionsTimeout = window.setTimeout(() => {
      this.showInstructions.set(false);
    }, 3000);
  }

  setDragging(isDragging: boolean): void {
    this.isDragging.set(isDragging);
  }

  async handleMultipleFileUpload(fileList: FileList): Promise<void> {
    const files = Array.from(fileList).filter(file => file.type === 'application/pdf');

    if (files.length === 0) {
      this.errorMessage.set('Por favor, selecione apenas arquivos PDF válidos');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    console.log(`[PDF Viewer] Uploading ${files.length} PDF(s)...`);

    try {
      await this.pdfjsReady;

      const docs: PdfDocument[] = files.map((file, index) => ({
        id: `pdf-upload-${index}-${Date.now()}`,
        url: '',
        name: file.name.replace('.pdf', ''),
        doc: null,
        totalPages: 0,
        isLoaded: false,
        isLoading: false,
        error: undefined,
        file
      }));

      this.pdfDocuments.set(docs);
      this.pdfLoaded.set(true);
      this.showInstructionsTemporarily();

      console.log('[PDF Viewer] Loading first uploaded PDF...');
      await this.loadPdfFromFile(0, files[0]);

      if (files.length > 1) {
        console.log('[PDF Viewer] Loading remaining PDFs in background...');
        this.loadRemainingUploadedPdfsInBackground(files);
      }
    } catch (error) {
      console.error('Erro ao carregar PDFs:', error);
      this.errorMessage.set('Erro ao carregar os arquivos PDF');
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadRemainingUploadedPdfsInBackground(files: File[]): Promise<void> {
    const loadPromises = files.slice(1).map((file, idx) =>
      this.loadPdfFromFile(idx + 1, file)
    );

    await Promise.allSettled(loadPromises);
    console.log('[PDF Viewer] All uploaded PDFs loaded');
  }

  async loadPdfFromFile(index: number, file: File): Promise<void> {
    const docs = this.pdfDocuments();
    if (!docs[index]) return;

    this.pdfDocuments.update(currentDocs => {
      const newDocs = [...currentDocs];
      newDocs[index] = { ...newDocs[index], isLoading: true };
      return newDocs;
    });

    try {
      console.log(`[PDF Viewer] Loading PDF ${index + 1}/${docs.length}: ${file.name}`);

      const arrayBuffer = await file.arrayBuffer();

      const pdfDoc = await this.renderer.loadDocumentFromData(arrayBuffer);

      this.pdfDocuments.update(currentDocs => {
        const newDocs = [...currentDocs];
        newDocs[index] = {
          ...newDocs[index],
          doc: pdfDoc,
          totalPages: pdfDoc.numPages,
          isLoaded: true,
          isLoading: false,
          error: undefined
        };
        return newDocs;
      });

      if (this.activeDocumentIndex() === index) {
        this.totalPages.set(pdfDoc.numPages);
        this.currentPage.set(1);
        await this.renderPage(1);
      }

      console.log(`[PDF Viewer] PDF ${index + 1} loaded successfully:`, pdfDoc.numPages, 'pages');
    } catch (error) {
      console.error(`[PDF Viewer] Error loading PDF ${index + 1}:`, error);

      this.pdfDocuments.update(currentDocs => {
        const newDocs = [...currentDocs];
        newDocs[index] = {
          ...newDocs[index],
          isLoading: false,
          error: 'Erro ao carregar'
        };
        return newDocs;
      });
    }
  }

  async loadPdfFromUrl(): Promise<void> {
    const url = this.pdfUrl();
    if (!url) {
      this.errorMessage.set('Por favor, insira uma URL válida');
      return;
    }

    await this.pdfjsReady;

    console.log('[PDF Viewer] Loading PDF from URL...');
    this.loadMultiplePdfs([url]);
  }

  async loadPdfFromData(data: ArrayBuffer, fileName: string = 'Documento'): Promise<void> {
    await this.pdfjsReady;

    const pdfDoc = await this.renderer.loadDocumentFromData(data);

    const doc: PdfDocument = {
      id: `pdf-upload-${Date.now()}`,
      url: '',
      name: fileName.replace('.pdf', ''),
      doc: pdfDoc,
      totalPages: pdfDoc.numPages,
      isLoaded: true,
      isLoading: false,
      error: undefined
    };

    this.pdfDocuments.set([doc]);
    this.activeDocumentIndex.set(0);
    this.totalPages.set(doc.totalPages);
    this.currentPage.set(1);
    this.pdfLoaded.set(true);
    this.showInstructionsTemporarily();
    await this.renderPage(1, true);

    console.log('[PDF Viewer] PDF uploaded successfully:', doc.totalPages, 'pages');
  }

  async renderPage(pageNumber: number, applyAutoFit: boolean = false): Promise<void> {
    const doc = this.activeDocument();
    if (!doc || !doc.doc) return;

    this.currentPage.set(pageNumber);

    if (!this.pdfContainer) {
      this.pendingRender = { pageNumber, applyAutoFit };
      return;
    }

    this.pendingRender = null;

    try {
      const container = this.pdfContainer;
      const prevClientW = container.clientWidth;
      const prevClientH = container.clientHeight;
      const prevScrollW = container.scrollWidth;
      const prevScrollH = container.scrollHeight;
      const prevMaxScrollLeft = Math.max(0, prevScrollW - prevClientW);
      const prevMaxScrollTop = Math.max(0, prevScrollH - prevClientH);
      const prevScrollLeft = container.scrollLeft;
      const prevScrollTop = container.scrollTop;
      const hadHOverflow = prevScrollW > prevClientW;
      const hadVOverflow = prevScrollH > prevClientH;
      const prevScrollLeftPct = prevMaxScrollLeft > 0 ? prevScrollLeft / prevMaxScrollLeft : 0;
      const prevScrollTopPct = prevMaxScrollTop > 0 ? prevScrollTop / prevMaxScrollTop : 0;

      const { canvas, appliedScale } = await this.renderer.renderPage(
        doc.doc,
        pageNumber,
        this.scale(),
        this.devicePixelRatio,
        applyAutoFit,
        async page => {
          const autoFitResult = PdfAutoFitCalculator.calculateFitToWidthScale(page, this.pdfContainer);
          if (autoFitResult) {
            const { scale } = autoFitResult;
            this.autoFitScale.set(scale);
            this.scale.set(scale);

            const calculatedScale = autoFitResult.pdfWidth === 0
              ? scale
              : autoFitResult.availableWidth / autoFitResult.pdfWidth;

            console.log('[PDF Viewer] Auto-fit scale calculated:', {
              containerWidth: autoFitResult.containerWidth,
              availableWidth: autoFitResult.availableWidth,
              horizontalPadding: autoFitResult.horizontalPadding,
              pdfWidth: autoFitResult.pdfWidth,
              calculatedScale,
              finalScale: scale,
              percentage: Math.round(scale * 100) + '%'
            });

            return scale;
          }

          return null;
        }
      );

      this.scale.set(appliedScale);

      console.log('[PDF Viewer] Rendering page:', {
        pageNumber,
        userScale: appliedScale,
        devicePixelRatio: this.devicePixelRatio,
        finalRenderScale: appliedScale * this.devicePixelRatio,
        canvasSize: `${canvas.width}x${canvas.height}px`,
        displaySize: `${canvas.style.width}x${canvas.style.height}`
      });

      container.innerHTML = '';
      container.appendChild(canvas);
      this.currentCanvas = canvas;
      this.lastRenderedScale = appliedScale;
      canvas.style.transform = '';
      canvas.style.transformOrigin = '';

      requestAnimationFrame(() => {
        try {
          const containerRect = container.getBoundingClientRect();
          const canvasRect = canvas.getBoundingClientRect();
          const hOverflow = canvasRect.width > containerRect.width;
          const vOverflow = canvasRect.height > containerRect.height;
          const overflows = hOverflow || vOverflow;
          this.isOverflowing.set(overflows);

          container.style.overflow = overflows ? 'auto' : 'hidden';
          (container.style as any).justifyContent = hOverflow ? 'flex-start' : 'center';
          (container.style as any).alignItems = vOverflow ? 'flex-start' : 'center';
          container.style.touchAction = overflows ? 'pan-x pan-y' : 'pan-y';

          const newClientW = container.clientWidth;
          const newClientH = container.clientHeight;
          const newScrollW = container.scrollWidth;
          const newScrollH = container.scrollHeight;
          const newMaxScrollLeft = Math.max(0, newScrollW - newClientW);
          const newMaxScrollTop = Math.max(0, newScrollH - newClientH);

          const focusToApply = this.pendingPinchViewportFocus;
          if (focusToApply && newScrollW > 0 && newScrollH > 0) {
            this.applyPendingPinchFocus(container, focusToApply, {
              appliedScale,
              newScrollWidth: newScrollW,
              newScrollHeight: newScrollH,
              newMaxScrollLeft,
              newMaxScrollTop,
              newClientWidth: newClientW,
              newClientHeight: newClientH
            });
            this.pendingPinchViewportFocus = null;
          } else {
            this.pendingPinchViewportFocus = null;

            if (hOverflow) {
              if (hadHOverflow) {
                container.scrollLeft = prevScrollLeftPct * newMaxScrollLeft;
              } else {
                container.scrollLeft = newMaxScrollLeft / 2;
              }
            } else {
              container.scrollLeft = 0;
            }

            if (vOverflow) {
              if (hadVOverflow) {
                container.scrollTop = prevScrollTopPct * newMaxScrollTop;
              } else {
                container.scrollTop = 0;
              }
            } else {
              container.scrollTop = 0;
            }
          }

          this.logScrollState('post-render', true);
        } catch {}
      });

      if (PdfUrlParser.updateUrlWithCurrentPage(pageNumber)) {
        console.log(`[PDF Viewer] URL updated to page ${pageNumber}`);
      }
    } catch (error) {
      console.error('Erro ao renderizar página:', error);
      this.errorMessage.set('Erro ao renderizar a página');
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.renderPage(this.currentPage() - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.renderPage(this.currentPage() + 1);
    }
  }

  goToPage(pageNumber: number): void {
    const validPage = Math.max(1, Math.min(pageNumber, this.totalPages()));
    if (validPage !== this.currentPage()) {
      this.pageTransitionDirection.set(validPage > this.currentPage() ? 'forward' : 'backward');
      this.renderPage(validPage);
    }
  }

  zoomIn(): void {
    this.scale.update(s => Math.min(s + 0.25, this.MAX_SCALE));
    this.renderPage(this.currentPage());
  }

  zoomOut(): void {
    this.scale.update(s => Math.max(s - 0.25, this.MIN_SCALE));
    this.renderPage(this.currentPage());
  }

  resetZoom(): void {
    const autoFit = this.autoFitScale();

    if (autoFit && autoFit > 0) {
      this.scale.set(autoFit);
      this.pendingPinchViewportFocus = null;
      this.renderPage(this.currentPage());
      return;
    }

    void this.fitToWidth();
  }

  async fitToWidth(): Promise<void> {
    const doc = this.activeDocument();
    if (!doc || !doc.doc) return;

    try {
      await this.renderPage(this.currentPage(), true);
      console.log('[PDF Viewer] Fit to width applied:', Math.round(this.scale() * 100) + '%');
    } catch (error) {
      console.error('[PDF Viewer] Error applying fit to width:', error);
    }
  }

  onPointerDown(event: PointerEvent): void {
    if (!this.isPointerSupported(event)) {
      return;
    }

    this.trackPointer(event);

    const target = event.target as HTMLElement | null;
    if (target?.setPointerCapture) {
      try {
        target.setPointerCapture(event.pointerId);
      } catch {}
    }

    if (this.activePointers.size === 1) {
      this.beginSwipe(event);
      return;
    }

    if (this.activePointers.size === 2) {
      this.beginPinch();
    }
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.activePointers.has(event.pointerId)) {
      return;
    }

    this.trackPointer(event);

    if (this.isPinching) {
      event.preventDefault();
      this.handlePinchMove();
      return;
    }

    if (this.activePointers.size >= 2) {
      this.beginPinch();
      return;
    }

    if (this.isSwipingActive()) {
      this.handleSwipeMove(event);
    }
  }

  onPointerUp(event: PointerEvent): void {
    if (!this.activePointers.has(event.pointerId)) {
      return;
    }

    if (this.isPinching) {
      this.activePointers.delete(event.pointerId);
      if (this.activePointers.size < 2) {
        this.endPinch(true);
      }
      return;
    }

    if (this.isSwipingActive()) {
      this.handleSwipeEnd(event);
    }

    this.activePointers.delete(event.pointerId);
  }

  onPointerCancel(event: PointerEvent): void {
    if (!this.activePointers.has(event.pointerId)) {
      return;
    }

    this.activePointers.delete(event.pointerId);

    if (this.isPinching) {
      this.endPinch(true);
      return;
    }

    this.cancelSwipe();
    this.isSwipingActive.set(false);
    this.swipeOffset.set(0);
  }

  private beginSwipe(event: PointerEvent): void {
    this.isPinching = false;
    this.touchStartX = event.clientX;
    this.touchStartY = event.clientY;
    this.touchStartTime = Date.now();
    this.isSwipingActive.set(true);
    this.swipeOffset.set(0);
  }

  private handleSwipeMove(event: PointerEvent): void {
    if (this.isOverflowing()) {
      return;
    }

    const currentX = event.clientX;
    const currentY = event.clientY;

    const deltaX = currentX - this.touchStartX;
    const deltaY = currentY - this.touchStartY;

    if (Math.abs(deltaY) > Math.abs(deltaX) * 0.5) {
      return;
    }

    let offset = deltaX;

    if (this.currentPage() === 1 && deltaX > 0) {
      offset = deltaX * 0.3;
    }

    if (this.currentPage() === this.totalPages() && deltaX < 0) {
      offset = deltaX * 0.3;
    }

    this.swipeOffset.set(offset);

    if (Math.abs(deltaX) > 10) {
      event.preventDefault();
    }
  }

  private handleSwipeEnd(event: PointerEvent): void {
    if (!this.isSwipingActive()) {
      return;
    }

    if (this.isOverflowing()) {
      this.isSwipingActive.set(false);
      this.swipeOffset.set(0);
      return;
    }

    const touchEndX = event.clientX;
    const touchEndY = event.clientY;
    const touchEndTime = Date.now();

    const horizontalDistance = Math.abs(touchEndX - this.touchStartX);
    const verticalDistance = Math.abs(touchEndY - this.touchStartY);
    const duration = touchEndTime - this.touchStartTime;
    const velocity = duration > 0 ? horizontalDistance / duration : 0;

    if (verticalDistance > horizontalDistance * 0.5) {
      this.cancelSwipe();
      return;
    }

    const swipeDirection = this.touchStartX - touchEndX;
    const isGoingForward = swipeDirection > 0;

    const screenWidth = window.innerWidth;
    const isSwipeFast = velocity > 0.5;
    const isSwipeLong = horizontalDistance > screenWidth * 0.5;

    const shouldChangePage = isSwipeFast || isSwipeLong;

    console.log('[PDF Viewer] Swipe metrics:', {
      distance: Math.round(horizontalDistance),
      duration: duration + 'ms',
      velocity: velocity.toFixed(3) + ' px/ms',
      isFast: isSwipeFast,
      isLong: isSwipeLong,
      shouldChange: shouldChangePage
    });

    if (shouldChangePage) {
      if (isGoingForward && this.currentPage() < this.totalPages()) {
        this.nextPage();
      } else if (!isGoingForward && this.currentPage() > 1) {
        this.previousPage();
      } else {
        this.cancelSwipe();
      }
    } else {
      this.cancelSwipe();
    }

    setTimeout(() => {
      this.isSwipingActive.set(false);
      this.swipeOffset.set(0);
    }, 300);
  }

  private beginPinch(): void {
    const pointers = this.getTouchLikePointers();
    if (pointers.length < 2) {
      return;
    }

    const initialDistance = this.calculateDistance(pointers[0], pointers[1]);
    if (initialDistance <= 0) {
      return;
    }

    this.isPinching = true;
    this.isSwipingActive.set(false);
    this.swipeOffset.set(0);

    this.pinchInitialDistance = initialDistance;
    this.pinchInitialScale = this.scale();
    this.pinchLastCenter = null;
    this.pinchCurrentFocus = null;
    this.pendingPinchViewportFocus = null;
    this.pinchStartTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

    if (this.pdfContainer) {
      this.previousTouchAction = this.pdfContainer.style.touchAction;
      this.pdfContainer.style.touchAction = 'none';
    }

    this.logScrollState('begin-pinch', true);
  }

  private handlePinchMove(): void {
    const pointers = this.getTouchLikePointers();
    if (pointers.length < 2 || this.pinchInitialDistance <= 0) {
      return;
    }

    const distance = this.calculateDistance(pointers[0], pointers[1]);
    if (distance <= 0) {
      return;
    }

    const scaleFactor = distance / this.pinchInitialDistance;
    const targetScale = this.clampScale(this.pinchInitialScale * scaleFactor);
    const center = this.calculateCenter(pointers[0], pointers[1]);

    this.scale.set(targetScale);
    this.updatePinchPreview(targetScale, center);
  }

  private endPinch(commit: boolean): void {
    if (!this.isPinching) {
      return;
    }

    this.isPinching = false;

    let applyAutoFitOnRender = false;

    if (commit) {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const pinchDuration = this.pinchStartTime > 0 ? now - this.pinchStartTime : Number.POSITIVE_INFINITY;
      const finalScale = this.scale();

      if (this.shouldSnapToAutoFitOnPinchEnd(finalScale, pinchDuration)) {
        applyAutoFitOnRender = true;
        this.pendingPinchViewportFocus = null;
      } else if (this.pinchCurrentFocus) {
        this.pendingPinchViewportFocus = this.pinchCurrentFocus;
      } else {
        this.pendingPinchViewportFocus = null;
      }
    } else {
      this.pendingPinchViewportFocus = null;
    }

    if (this.pdfContainer) {
      const fallback = this.isOverflowing() ? 'pan-x pan-y' : 'pan-y';
      this.pdfContainer.style.touchAction = this.previousTouchAction || fallback;
      this.previousTouchAction = '';
    }

    if (this.currentCanvas) {
      this.currentCanvas.style.transform = '';
      this.currentCanvas.style.transformOrigin = '';
    }

    if (commit) {
      const logReason = applyAutoFitOnRender ? 'end-pinch-autofit' : 'end-pinch-commit';
      this.logScrollState(logReason, true);
      void this.renderPage(this.currentPage(), applyAutoFitOnRender);
    } else {
      this.scale.set(this.pinchInitialScale);
      this.logScrollState('end-pinch-cancel', true);
    }

    this.pinchInitialDistance = 0;
    this.pinchCurrentFocus = null;
    this.pinchLastCenter = null;
    this.pinchStartTime = 0;
  }

  private shouldSnapToAutoFitOnPinchEnd(finalScale: number, durationMs: number): boolean {
    const autoFit = this.autoFitScale();
    if (!autoFit || !(autoFit > 0) || !(finalScale > 0) || !(this.pinchInitialScale > 0)) {
      return false;
    }

    if (finalScale >= this.pinchInitialScale) {
      return false;
    }

    const dropRatio = finalScale / this.pinchInitialScale;
    const isQuickGesture = Number.isFinite(durationMs) && durationMs <= 350;
    const scaledOutAggressively = dropRatio <= 0.85;
    const nearOrBelowAutoFit = finalScale <= autoFit * 1.05;

    return isQuickGesture && scaledOutAggressively && nearOrBelowAutoFit;
  }

  private updatePinchPreview(scale: number, center: { x: number; y: number } | null): void {
    const canvas = this.currentCanvas;
    if (!canvas) {
      return;
    }

    const baseScale = this.lastRenderedScale || 1;
    const ratio = baseScale > 0 ? scale / baseScale : 1;

    if (center && Number.isFinite(center.x) && Number.isFinite(center.y)) {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const originX = ((center.x - rect.left) / rect.width) * 100;
        const originY = ((center.y - rect.top) / rect.height) * 100;
        canvas.style.transformOrigin = `${originX}% ${originY}%`;
      }
    } else {
      canvas.style.transformOrigin = '50% 50%';
    }

    canvas.style.transform = `scale(${ratio})`;

    if (center) {
      this.pinchLastCenter = center;
      const focus = this.computePinchFocus(center, ratio);
      if (focus) {
        this.pinchCurrentFocus = focus;
      }
    }

    this.logScrollState('pinch-preview');
  }

  private trackPointer(event: PointerEvent): void {
    if (!this.isPointerSupported(event)) {
      return;
    }

    this.activePointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
      pointerType: event.pointerType
    });
  }

  private getTouchLikePointers(): PointerInfo[] {
    return Array.from(this.activePointers.values()).filter(pointer => pointer.pointerType === 'touch' || pointer.pointerType === 'pen');
  }

  private calculateDistance(a: PointerInfo, b: PointerInfo): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.hypot(dx, dy);
  }

  private calculateCenter(a: PointerInfo, b: PointerInfo): { x: number; y: number } {
    return {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2
    };
  }

  private clampScale(value: number): number {
    return Math.max(this.MIN_SCALE, Math.min(value, this.MAX_SCALE));
  }

  private isPointerSupported(event: PointerEvent): boolean {
    return event.pointerType === 'touch' || event.pointerType === 'pen';
  }

  private computePinchFocus(center: { x: number; y: number }, displayScaleRatio: number): PinchViewportFocus | null {
    if (!this.pdfContainer || !this.currentCanvas) {
      return null;
    }

    const container = this.pdfContainer;
    const canvas = this.currentCanvas;
    const baseScale = this.lastRenderedScale;
    const deviceScale = this.devicePixelRatio || 1;
    const ratio = displayScaleRatio > 0 ? displayScaleRatio : 1;

    if (!(baseScale > 0) || !(deviceScale > 0)) {
      return null;
    }

    const rect = container.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();

    const offsetXFromContainer = center.x - rect.left;
    const offsetYFromContainer = center.y - rect.top;

    const centerWithinCanvasX = center.x - canvasRect.left;
    const centerWithinCanvasY = center.y - canvasRect.top;

    if (!Number.isFinite(centerWithinCanvasX) || !Number.isFinite(centerWithinCanvasY)) {
      return null;
    }

    const clampedCanvasOffsetX = this.clampValue(centerWithinCanvasX, 0, canvasRect.width);
    const clampedCanvasOffsetY = this.clampValue(centerWithinCanvasY, 0, canvasRect.height);

    const baseOffsetX = clampedCanvasOffsetX / ratio;
    const baseOffsetY = clampedCanvasOffsetY / ratio;

    const pdfWidth = canvas.width / (deviceScale * baseScale);
    const pdfHeight = canvas.height / (deviceScale * baseScale);

    if (!(pdfWidth > 0) || !(pdfHeight > 0)) {
      return null;
    }

    const pdfX = (container.scrollLeft + baseOffsetX) / baseScale;
    const pdfY = (container.scrollTop + baseOffsetY) / baseScale;
    const pdfXRatio = this.clampValue(pdfWidth > 0 ? pdfX / pdfWidth : 0, 0, 1);
    const pdfYRatio = this.clampValue(pdfHeight > 0 ? pdfY / pdfHeight : 0, 0, 1);

    const clientWidth = container.clientWidth || 1;
    const clientHeight = container.clientHeight || 1;

    const clampedViewportOffsetX = this.clampValue(offsetXFromContainer, 0, clientWidth);
    const clampedViewportOffsetY = this.clampValue(offsetYFromContainer, 0, clientHeight);

    return {
      pdfX: this.clampValue(pdfX, 0, pdfWidth),
      pdfY: this.clampValue(pdfY, 0, pdfHeight),
      pdfWidth,
      pdfHeight,
      pdfXRatio,
      pdfYRatio,
      viewportOffsetX: clampedViewportOffsetX,
      viewportOffsetY: clampedViewportOffsetY,
      viewportOffsetXRatio: this.clampValue(clampedViewportOffsetX / clientWidth, 0, 1),
      viewportOffsetYRatio: this.clampValue(clampedViewportOffsetY / clientHeight, 0, 1)
    };
  }

  private applyPendingPinchFocus(
    container: HTMLDivElement,
    focus: PinchViewportFocus,
    metrics: {
      appliedScale: number;
      newScrollWidth: number;
      newScrollHeight: number;
      newMaxScrollLeft: number;
      newMaxScrollTop: number;
      newClientWidth: number;
      newClientHeight: number;
    }
  ): void {
    const {
      appliedScale,
      newScrollWidth,
      newScrollHeight,
      newMaxScrollLeft,
      newMaxScrollTop,
      newClientWidth,
      newClientHeight
    } = metrics;

    if (!(appliedScale > 0)) {
      return;
    }

    const contentWidth = focus.pdfWidth * appliedScale;
    const contentHeight = focus.pdfHeight * appliedScale;

    const ratioBasedScrollLeft = contentWidth > newClientWidth
      ? focus.pdfXRatio * contentWidth - focus.viewportOffsetXRatio * newClientWidth
      : 0;

    const ratioBasedScrollTop = contentHeight > newClientHeight
      ? focus.pdfYRatio * contentHeight - focus.viewportOffsetYRatio * newClientHeight
      : 0;

    const absoluteScrollLeft = focus.pdfX * appliedScale - focus.viewportOffsetX;
    const absoluteScrollTop = focus.pdfY * appliedScale - focus.viewportOffsetY;

    const clampedRatioLeft = Number.isFinite(ratioBasedScrollLeft)
      ? this.clampValue(ratioBasedScrollLeft, 0, newMaxScrollLeft)
      : null;
    const clampedAbsoluteLeft = Number.isFinite(absoluteScrollLeft)
      ? this.clampValue(absoluteScrollLeft, 0, newMaxScrollLeft)
      : null;

    const clampedRatioTop = Number.isFinite(ratioBasedScrollTop)
      ? this.clampValue(ratioBasedScrollTop, 0, newMaxScrollTop)
      : null;
    const clampedAbsoluteTop = Number.isFinite(absoluteScrollTop)
      ? this.clampValue(absoluteScrollTop, 0, newMaxScrollTop)
      : null;

    container.scrollLeft = this.mixScrollTarget(clampedRatioLeft, clampedAbsoluteLeft, newMaxScrollLeft);
    container.scrollTop = this.mixScrollTarget(clampedRatioTop, clampedAbsoluteTop, newMaxScrollTop);
  }

  private mixScrollTarget(
    ratioValue: number | null,
    absoluteValue: number | null,
    maxScroll: number
  ): number {
    const boundedMax = Number.isFinite(maxScroll) && maxScroll > 0 ? maxScroll : 0;

    const safeClamped = (value: number | null): number | null => {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return null;
      }
      return this.clampValue(value, 0, boundedMax);
    };

    const ratio = safeClamped(ratioValue);
    const absolute = safeClamped(absoluteValue);

    if (ratio === null && absolute === null) {
      return 0;
    }

    if (ratio === null) {
      return absolute!;
    }

    if (absolute === null) {
      return ratio;
    }

    const difference = Math.abs(ratio - absolute);

    if (difference <= 4) {
      return ratio;
    }

    const tolerance = 24;
    const fadeRange = 256;
    const excess = Math.max(0, difference - tolerance);
    const weight = Math.max(0, 1 - excess / fadeRange);

    return absolute + (ratio - absolute) * weight;
  }

  private clampValue(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) {
      return min;
    }
    if (value < min) {
      return min;
    }
    if (value > max) {
      return max;
    }
    return value;
  }

  private logScrollState(reason: string, force = false): void {
    const container = this.pdfContainer;
    if (!container) {
      return;
    }

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (!force && now - this.lastScrollDebugLog < 200) {
      return;
    }
    this.lastScrollDebugLog = now;

    const elements: { label: string; element: HTMLElement | null }[] = [
      { label: 'container', element: container }
    ];

    let parent = container.parentElement;
    let level = 1;
    while (parent && level <= 4) {
      elements.push({ label: `parent-${level}`, element: parent as HTMLElement });
      parent = parent.parentElement;
      level++;
    }

    for (const entry of elements) {
      const el = entry.element;
      if (!el) continue;

      const computed = typeof window !== 'undefined' && window.getComputedStyle
        ? window.getComputedStyle(el)
        : null;

      console.log('[PDF Viewer][ScrollDebug]', reason, {
        target: entry.label,
        tag: el.tagName,
        classList: Array.from(el.classList || []),
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        scrollLeft: el.scrollLeft,
        scrollTop: el.scrollTop,
        overflowX: computed?.overflowX,
        overflowY: computed?.overflowY
      });
    }
  }

  cancelSwipe(): void {
    console.log('[PDF Viewer] Swipe cancelled - returning to original position');
    this.swipeOffset.set(0);
  }

  onKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowLeft':
        this.previousPage();
        event.preventDefault();
        break;
      case 'ArrowRight':
        this.nextPage();
        event.preventDefault();
        break;
      case '+':
      case '=':
        this.zoomIn();
        event.preventDefault();
        break;
      case '-':
        this.zoomOut();
        event.preventDefault();
        break;
      case '0':
        this.resetZoom();
        event.preventDefault();
        break;
    }
  }
}
