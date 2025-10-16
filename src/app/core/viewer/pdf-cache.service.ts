import { Injectable } from '@angular/core';

@Injectable({ 
  providedIn: 'root' 
})
export class PdfCacheService {
  private cache = new Map<string, string>(); // url -> blobUrl
  
  async cacheUrl(url: string): Promise<string> {
    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status}`);
      }
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      this.cache.set(url, blobUrl);
      return blobUrl;
    } catch (error) {
      console.error('[PDF-CACHE] Failed to cache URL:', url, error);
      throw error;
    }
  }
  
  getCached(url: string): string | null {
    return this.cache.get(url) ?? null;
  }
  
  revoke(url: string): void {
    const blobUrl = this.cache.get(url);
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      this.cache.delete(url);
    }
  }
  
  revokeAll(): void {
    for (const [url, blobUrl] of this.cache.entries()) {
      URL.revokeObjectURL(blobUrl);
    }
    this.cache.clear();
  }
  
  getCacheSize(): number {
    return this.cache.size;
  }
}
