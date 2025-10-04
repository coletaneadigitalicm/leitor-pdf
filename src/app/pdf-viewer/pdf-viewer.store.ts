import { Injectable, signal, computed } from '@angular/core';

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
  private pdfjsLib: any;
  private pdfjsReady: Promise<void>;
  private lastLoadedUrl = '';
  private resizeTimeout?: number;
  private devicePixelRatio = 1;
  private pdfContainer?: HTMLDivElement;
  private pendingRender: { pageNumber: number; applyAutoFit: boolean } | null = null;

  constructor() {
    this.pdfjsReady = this.loadPdfJs();
    this.devicePixelRatio = window.devicePixelRatio || 1;
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
      const page = await doc.doc.getPage(this.currentPage());
      await this.calculateFitToWidthScale(page);
      await this.renderPage(this.currentPage());
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
      const initialPage = this.extractPageFromUrl(url);
      const cleanUrl = url.split('#')[0];

      return {
        id: `pdf-${index}-${Date.now()}`,
        url: cleanUrl,
        name: this.extractFileName(url, index),
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

      const loadingTask = this.pdfjsLib.getDocument({
        url: doc.url,
        disableRange: false,
        disableStream: false,
        disableAutoFetch: true,
        rangeChunkSize: 524288,
      });

      loadingTask.onProgress = (progressData: any) => {
        if (progressData.total > 0) {
          const percent = Math.round((progressData.loaded / progressData.total) * 100);
          console.log(`[PDF Viewer] Download progress: ${percent}% (${progressData.loaded}/${progressData.total} bytes)`);
        }
      };

      const pdfDoc = await loadingTask.promise;
      console.log('[PDF Viewer] PDF metadata loaded, pages will be fetched on demand');

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

  async loadPdfJs() {
    try {
      const pdfjs = await import('pdfjs-dist');
      this.pdfjsLib = pdfjs;
      this.pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
      console.log('[PDF Viewer] PDF.js loaded successfully, version:', pdfjs.version);
    } catch (error) {
      console.error('Erro ao carregar PDF.js:', error);
      this.errorMessage.set('Erro ao inicializar o visualizador de PDF');
      throw error;
    }
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

      const loadingTask = this.pdfjsLib.getDocument({
        data: arrayBuffer,
        disableAutoFetch: true,
        disableStream: false,
        disableRange: false,
      });

      const pdfDoc = await loadingTask.promise;

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

    const loadingTask = this.pdfjsLib.getDocument({ data });
    const pdfDoc = await loadingTask.promise;

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

  private extractFileName(url: string, index: number): string {
    try {
      const decodedUrl = decodeURIComponent(url);
      const urlWithoutHash = decodedUrl.split('#')[0];
      const urlObj = new URL(urlWithoutHash);
      const pathname = urlObj.pathname;
      const fileName = pathname.split('/').pop() || '';

      if (fileName && fileName.endsWith('.pdf')) {
        return fileName.replace('.pdf', '');
      }

      return `Documento ${index + 1}`;
    } catch {
      return `Documento ${index + 1}`;
    }
  }

  private extractPageFromUrl(url: string): number | undefined {
    try {
      if (!url.includes('#')) {
        return undefined;
      }

      const hash = url.split('#')[1];

      if (!hash) {
        return undefined;
      }

      const pageMatch = hash.match(/page=(\d+)/i);

      if (pageMatch && pageMatch[1]) {
        const pageNum = parseInt(pageMatch[1], 10);
        console.log(`[PDF Viewer] Found page number in URL hash: ${pageNum}`);
        return pageNum;
      }

      return undefined;
    } catch (error) {
      console.warn('[PDF Viewer] Error extracting page from URL:', error);
      return undefined;
    }
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
      const page = await doc.doc.getPage(pageNumber);

      if (applyAutoFit) {
        await this.calculateFitToWidthScale(page);
      }

      const renderScale = this.scale() * this.devicePixelRatio;
      const viewport = page.getViewport({ scale: renderScale });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      canvas.height = viewport.height;
      canvas.width = viewport.width;
      canvas.style.width = `${viewport.width / this.devicePixelRatio}px`;
      canvas.style.height = `${viewport.height / this.devicePixelRatio}px`;

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      console.log('[PDF Viewer] Rendering page:', {
        pageNumber,
        userScale: this.scale(),
        devicePixelRatio: this.devicePixelRatio,
        finalRenderScale: renderScale,
        canvasSize: `${canvas.width}x${canvas.height}px`,
        displaySize: `${canvas.style.width}x${canvas.style.height}`
      });

      await page.render(renderContext).promise;

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

      container.innerHTML = '';
      container.appendChild(canvas);

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
        } catch {}
      });

      this.updateUrlWithCurrentPage(pageNumber);
    } catch (error) {
      console.error('Erro ao renderizar página:', error);
      this.errorMessage.set('Erro ao renderizar a página');
    }
  }

  private async calculateFitToWidthScale(page: any): Promise<void> {
    try {
      const originalViewport = page.getViewport({ scale: 1.0 });
      const containerWidth = this.pdfContainer?.offsetWidth ?? 0;
      const paddingTotal = 64;
      const availableWidth = containerWidth - paddingTotal;
      const fitScale = availableWidth / originalViewport.width;
      const finalScale = Math.max(0.5, Math.min(fitScale, 9.0));

      this.autoFitScale.set(finalScale);
      this.scale.set(finalScale);

      console.log('[PDF Viewer] Auto-fit scale calculated:', {
        containerWidth,
        availableWidth,
        pdfWidth: originalViewport.width,
        calculatedScale: fitScale,
        finalScale: finalScale,
        percentage: Math.round(finalScale * 100) + '%'
      });
    } catch (error) {
      console.error('[PDF Viewer] Error calculating fit-to-width scale:', error);
    }
  }

  private updateUrlWithCurrentPage(pageNumber: number) {
    const urlParams = new URLSearchParams(window.location.search);
    const urlParam = urlParams.get('url');

    if (urlParam) {
      const cleanUrl = urlParam.split('#')[0];
      const newUrlParam = `${cleanUrl}#page=${pageNumber}`;
      urlParams.set('url', newUrlParam);
      const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
      window.history.replaceState(null, '', newUrl);
      console.log(`[PDF Viewer] URL updated to page ${pageNumber}`);
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
    this.scale.update(s => Math.min(s + 0.25, 9.0));
    this.renderPage(this.currentPage());
  }

  zoomOut(): void {
    this.scale.update(s => Math.max(s - 0.25, 0.5));
    this.renderPage(this.currentPage());
  }

  resetZoom(): void {
    this.scale.set(1.0);
    this.renderPage(this.currentPage());
  }

  async fitToWidth(): Promise<void> {
    const doc = this.activeDocument();
    if (!doc || !doc.doc) return;

    try {
      const page = await doc.doc.getPage(this.currentPage());
      await this.calculateFitToWidthScale(page);
      await this.renderPage(this.currentPage());
      console.log('[PDF Viewer] Fit to width applied:', Math.round(this.scale() * 100) + '%');
    } catch (error) {
      console.error('[PDF Viewer] Error applying fit to width:', error);
    }
  }

  onTouchStart(event: TouchEvent): void {
    const touch = event.changedTouches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchStartTime = Date.now();
    this.isSwipingActive.set(true);
    this.swipeOffset.set(0);
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.isSwipingActive()) return;
    if (this.isOverflowing()) return;

    const touch = event.changedTouches[0];
    const currentX = touch.clientX;
    const currentY = touch.clientY;

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

  onTouchEnd(event: TouchEvent): void {
    if (!this.isSwipingActive()) return;
    if (this.isOverflowing()) {
      this.isSwipingActive.set(false);
      this.swipeOffset.set(0);
      return;
    }

    const touch = event.changedTouches[0];
    const touchEndX = touch.clientX;
    const touchEndY = touch.clientY;
    const touchEndTime = Date.now();

    const horizontalDistance = Math.abs(touchEndX - this.touchStartX);
    const verticalDistance = Math.abs(touchEndY - this.touchStartY);
    const duration = touchEndTime - this.touchStartTime;
    const velocity = horizontalDistance / duration;

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
