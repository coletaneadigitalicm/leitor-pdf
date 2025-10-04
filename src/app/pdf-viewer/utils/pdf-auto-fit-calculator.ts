export interface AutoFitOptions {
  padding?: number;
  minScale?: number;
  maxScale?: number;
}

export interface AutoFitResult {
  scale: number;
  containerWidth: number;
  availableWidth: number;
  pdfWidth: number;
}

export class PdfAutoFitCalculator {
  static calculateFitToWidthScale(
    page: any,
    container?: HTMLElement,
    options: AutoFitOptions = {}
  ): AutoFitResult | null {
    if (!page || !container) {
      return null;
    }

    const {
      padding = 64,
      minScale = 0.5,
      maxScale = 9.0
    } = options;

    try {
      const originalViewport = page.getViewport({ scale: 1.0 });
      const containerWidth = container.offsetWidth ?? 0;
      const availableWidth = containerWidth - padding;
      const fitScale = availableWidth / originalViewport.width;
      const finalScale = Math.max(minScale, Math.min(fitScale, maxScale));

      return {
        scale: finalScale,
        containerWidth,
        availableWidth,
        pdfWidth: originalViewport.width
      };
    } catch {
      return null;
    }
  }
}
