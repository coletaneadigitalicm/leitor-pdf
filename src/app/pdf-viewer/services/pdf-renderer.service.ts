import { Injectable, signal } from '@angular/core';

export interface RenderRequest {
  pageNumber: number;
  applyAutoFit: boolean;
}

@Injectable({ providedIn: 'root' })
export class PdfRendererService {
  private pdfjsLib: any;
  private pdfjsReady?: Promise<void>;
  readonly devicePixelRatio = signal(window.devicePixelRatio || 1);

  constructor() {
    this.pdfjsReady = this.loadPdfJs();
  }

  getPdfJsReady(): Promise<void> {
    if (!this.pdfjsReady) {
      this.pdfjsReady = this.loadPdfJs();
    }
    return this.pdfjsReady;
  }

  setDevicePixelRatio(value: number): void {
    this.devicePixelRatio.set(value);
  }

  async loadDocumentFromUrl(url: string, options?: { onProgress?: (progressData: any) => void }) {
    await this.getPdfJsReady();
    const loadingTask = this.pdfjsLib.getDocument({
      url,
      disableRange: false,
      disableStream: false,
      disableAutoFetch: true,
      rangeChunkSize: 524288,
    });

    if (options?.onProgress) {
      loadingTask.onProgress = options.onProgress;
    }

    return loadingTask.promise;
  }

  async loadDocumentFromData(data: ArrayBuffer, options?: { onProgress?: (progressData: any) => void }) {
    await this.getPdfJsReady();
    const loadingTask = this.pdfjsLib.getDocument({
      data,
      disableAutoFetch: true,
      disableStream: false,
      disableRange: false,
    });

    if (options?.onProgress) {
      loadingTask.onProgress = options.onProgress;
    }

    return loadingTask.promise;
  }

  async renderPage(
    doc: any,
    pageNumber: number,
    scale: number,
    devicePixelRatio: number,
    applyAutoFit: boolean,
    calculateFitToWidth?: (page: any) => Promise<number | null>
  ): Promise<{ canvas: HTMLCanvasElement; viewport: any; appliedScale: number }> {
    await this.getPdfJsReady();

    const page = await doc.getPage(pageNumber);

    if (applyAutoFit && calculateFitToWidth) {
      const newScale = await calculateFitToWidth(page);
      if (newScale !== null) {
        scale = newScale;
      }
    }

    const renderScale = scale * devicePixelRatio;
    const viewport = page.getViewport({ scale: renderScale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    canvas.height = viewport.height;
    canvas.width = viewport.width;
    canvas.style.width = `${viewport.width / devicePixelRatio}px`;
    canvas.style.height = `${viewport.height / devicePixelRatio}px`;

    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };

    await page.render(renderContext).promise;

    return {
      canvas,
      viewport,
      appliedScale: scale
    };
  }

  private async loadPdfJs(): Promise<void> {
    if (this.pdfjsLib) {
      return;
    }

    const pdfjs = await import('pdfjs-dist');
    this.pdfjsLib = pdfjs;
    this.pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
  }
}
