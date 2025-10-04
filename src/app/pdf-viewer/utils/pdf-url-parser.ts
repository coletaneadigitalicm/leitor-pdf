export class PdfUrlParser {
  static extractFileName(url: string, index: number): string {
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

  static extractPageFromUrl(url: string): number | undefined {
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
        return pageNum;
      }

      return undefined;
    } catch {
      return undefined;
    }
  }

  static updateUrlWithCurrentPage(pageNumber: number): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const urlParam = urlParams.get('url');

    if (!urlParam) {
      return false;
    }

    const cleanUrl = urlParam.split('#')[0];
    const newUrlParam = `${cleanUrl}#page=${pageNumber}`;
    urlParams.set('url', newUrlParam);
    const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
    window.history.replaceState(null, '', newUrl);
    return true;
  }
}
