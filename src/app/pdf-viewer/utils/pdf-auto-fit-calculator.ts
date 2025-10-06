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
  horizontalPadding: number;
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
      const containerWidth = this.getContainerWidth(container);
      const horizontalPadding = this.getHorizontalPadding(container, padding);
      const availableWidth = Math.max(0, containerWidth - horizontalPadding);
      const fitScale = availableWidth / originalViewport.width;
      const finalScale = Math.max(minScale, Math.min(fitScale, maxScale));

      return {
        scale: finalScale,
        containerWidth,
        availableWidth,
        pdfWidth: originalViewport.width,
        horizontalPadding
      };
    } catch {
      return null;
    }
  }

  private static getContainerWidth(container: HTMLElement): number {
    if (!container) {
      return 0;
    }

    const clientWidth = container.clientWidth;
    const offsetWidth = container.offsetWidth;

    if (clientWidth > 0) {
      return clientWidth;
    }

    if (offsetWidth > 0) {
      return offsetWidth;
    }

    return 0;
  }

  private static getHorizontalPadding(container: HTMLElement, fallbackPadding: number): number {
    if (!container) {
      return fallbackPadding;
    }

    if (typeof window === 'undefined' || !window.getComputedStyle) {
      return fallbackPadding;
    }

    try {
      const styles = window.getComputedStyle(container);
      const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0;
      const paddingRight = Number.parseFloat(styles.paddingRight) || 0;
      const totalPadding = paddingLeft + paddingRight;

      if (Number.isNaN(totalPadding)) {
        return fallbackPadding;
      }

      return totalPadding;
    } catch {
      return fallbackPadding;
    }
  }
}
