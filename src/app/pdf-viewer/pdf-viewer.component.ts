import { Component, OnInit, ViewChild, ElementRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

interface PdfPage {
  canvas: HTMLCanvasElement;
  pageNum: number;
}

interface PdfDocument {
  id: string;
  url: string;
  name: string;
  doc: any;
  totalPages: number;
  isLoaded: boolean;
  isLoading: boolean;
  error?: string;
  file?: File; // Armazena o arquivo quando é upload
}

@Component({
  selector: 'app-pdf-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pdf-viewer.component.html',
  styleUrls: ['./pdf-viewer.component.scss']
})
export class PdfViewerComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('pdfContainer') pdfContainer!: ElementRef<HTMLDivElement>;

  // Múltiplos PDFs
  pdfDocuments = signal<PdfDocument[]>([]);
  activeDocumentIndex = signal(0);
  activeDocument = computed(() => this.pdfDocuments()[this.activeDocumentIndex()] || null);
  hasMultipleDocs = computed(() => this.pdfDocuments().length > 1);

  // Estado atual
  currentPage = signal(1);
  totalPages = signal(0);
  scale = signal(1.0);
  pdfUrl = signal('');
  isLoading = signal(false);
  errorMessage = signal('');
  isDragging = signal(false);
  pdfLoaded = signal(false);

  private touchStartX = 0;
  private touchEndX = 0;
  private pdfjsLib: any;

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.loadPdfJs();
    this.checkUrlParameter();
  }

  private checkUrlParameter() {
    // Verifica se há parâmetros 'url' ou 'urls' na query string
    this.route.queryParams.subscribe(params => {
      const urlParam = params['url'];
      const urlsParam = params['urls'];

      if (urlsParam) {
        // Múltiplas URLs separadas por vírgula ou pipe
        const urls = urlsParam.split(/[,|]/).map((u: string) => u.trim()).filter((u: string) => u);
        console.log('[PDF Viewer] Multiple URLs detected:', urls.length);
        this.loadMultiplePdfs(urls);
      } else if (urlParam) {
        const decodedUrl = decodeURIComponent(urlParam);
        console.log('[PDF Viewer] Single URL detected:', decodedUrl);
        this.loadMultiplePdfs([decodedUrl]);
      } else {
        console.log('[PDF Viewer] No query param found, showing upload screen');
      }
    });
  }

  private async loadMultiplePdfs(urls: string[]) {
    if (urls.length === 0) return;

    // Cria os documentos
    const docs: PdfDocument[] = urls.map((url, index) => ({
      id: `pdf-${index}-${Date.now()}`,
      url: decodeURIComponent(url),
      name: this.extractFileName(url, index),
      doc: null,
      totalPages: 0,
      isLoaded: false,
      isLoading: false,
      error: undefined
    }));

    this.pdfDocuments.set(docs);
    this.pdfLoaded.set(true);

    // Carrega o primeiro PDF imediatamente
    console.log('[PDF Viewer] Loading first PDF...');
    await this.loadPdfDocument(0);

    // Carrega os outros PDFs em paralelo em background
    if (docs.length > 1) {
      console.log('[PDF Viewer] Loading remaining PDFs in background...');
      this.loadRemainingPdfsInBackground();
    }
  }

  private async loadPdfDocument(index: number) {
    const docs = this.pdfDocuments();
    if (index < 0 || index >= docs.length) return;

    const doc = docs[index];
    if (doc.isLoaded || doc.isLoading) return;

    // Atualiza estado de forma imutável
    this.pdfDocuments.update(currentDocs => {
      const newDocs = [...currentDocs];
      newDocs[index] = { ...newDocs[index], isLoading: true };
      return newDocs;
    });

    try {
      console.log(`[PDF Viewer] Loading PDF ${index + 1}/${docs.length}:`, doc.url);
      const loadingTask = this.pdfjsLib.getDocument(doc.url);
      const pdfDoc = await loadingTask.promise;

      // Atualiza o estado de forma imutável após carregar
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

      // Se é o documento ativo, renderiza
      if (this.activeDocumentIndex() === index) {
        this.totalPages.set(pdfDoc.numPages);
        this.currentPage.set(1);
        await this.renderPage(1);
      }

      console.log(`[PDF Viewer] PDF ${index + 1} loaded successfully:`, pdfDoc.numPages, 'pages');
    } catch (error) {
      console.error(`[PDF Viewer] Error loading PDF ${index + 1}:`, error);
      
      // Atualiza estado de erro de forma imutável
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

      // Se é o primeiro PDF e falhou, mostra erro
      if (index === 0) {
        this.errorMessage.set('Erro ao carregar o primeiro PDF. Verifique a URL.');
      }
    }
  }

  private async loadRemainingPdfsInBackground() {
    const docs = this.pdfDocuments();
    const loadPromises = [];

    for (let i = 1; i < docs.length; i++) {
      loadPromises.push(this.loadPdfDocument(i));
    }

    await Promise.allSettled(loadPromises);
    console.log('[PDF Viewer] All PDFs loaded');
  }

  private extractFileName(url: string, index: number): string {
    try {
      const decodedUrl = decodeURIComponent(url);
      const urlObj = new URL(decodedUrl);
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

  switchToDocument(index: number) {
    if (index < 0 || index >= this.pdfDocuments().length) return;
    if (index === this.activeDocumentIndex()) return;

    console.log(`[PDF Viewer] Switching to document ${index + 1}`);
    
    // Troca para o novo documento
    this.activeDocumentIndex.set(index);

    const doc = this.activeDocument();
    if (doc && doc.isLoaded) {
      // Restaura com o zoom atual (persistente) e volta para página 1
      this.totalPages.set(doc.totalPages);
      this.currentPage.set(1);
      // scale mantém o valor atual (persistente entre documentos)
      this.renderPage(1);
    } else if (doc && !doc.isLoading) {
      // Carrega o documento se ainda não foi carregado
      this.loadPdfDocument(index);
    }
  }

  async loadPdfJs() {
    try {
      // Carrega a biblioteca PDF.js dinamicamente
      const pdfjs = await import('pdfjs-dist');
      this.pdfjsLib = pdfjs;
      
      // Configura o worker usando o CDN
      this.pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
    } catch (error) {
      console.error('Erro ao carregar PDF.js:', error);
      this.errorMessage.set('Erro ao inicializar o visualizador de PDF');
    }
  }

  // Drag and Drop
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleMultipleFileUpload(files);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleMultipleFileUpload(input.files);
    }
  }

  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  async handleMultipleFileUpload(fileList: FileList) {
    // Converte FileList para Array e filtra apenas PDFs
    const files = Array.from(fileList).filter(file => file.type === 'application/pdf');

    if (files.length === 0) {
      this.errorMessage.set('Por favor, selecione apenas arquivos PDF válidos');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    console.log(`[PDF Viewer] Uploading ${files.length} PDF(s)...`);

    try {
      // Cria os documentos para todos os arquivos
      const docs: PdfDocument[] = files.map((file, index) => ({
        id: `pdf-upload-${index}-${Date.now()}`,
        url: '',
        name: file.name.replace('.pdf', ''),
        doc: null,
        totalPages: 0,
        isLoaded: false,
        isLoading: false,
        error: undefined,
        file: file // Armazena o arquivo para carregar depois
      }));

      this.pdfDocuments.set(docs);
      this.pdfLoaded.set(true);

      // Carrega o primeiro PDF imediatamente
      console.log('[PDF Viewer] Loading first uploaded PDF...');
      await this.loadPdfFromFile(0, files[0]);

      // Carrega os demais PDFs em background
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

  async handleFileUpload(file: File) {
    // Método legado - redireciona para o novo método
    const fileList = new DataTransfer();
    fileList.items.add(file);
    await this.handleMultipleFileUpload(fileList.files);
  }

  private async loadPdfFromFile(index: number, file: File) {
    const docs = this.pdfDocuments();
    if (!docs[index]) return;

    // Marca como carregando de forma imutável
    this.pdfDocuments.update(currentDocs => {
      const newDocs = [...currentDocs];
      newDocs[index] = { ...newDocs[index], isLoading: true };
      return newDocs;
    });

    try {
      console.log(`[PDF Viewer] Loading PDF ${index + 1}/${docs.length}: ${file.name}`);
      
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = this.pdfjsLib.getDocument({ data: arrayBuffer });
      const pdfDoc = await loadingTask.promise;

      // Atualiza o documento de forma imutável
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

      // Se for o documento ativo, renderiza
      if (this.activeDocumentIndex() === index) {
        this.totalPages.set(pdfDoc.numPages);
        this.currentPage.set(1);
        await this.renderPage(1);
      }

      console.log(`[PDF Viewer] PDF ${index + 1} loaded successfully:`, pdfDoc.numPages, 'pages');
    } catch (error) {
      console.error(`[PDF Viewer] Error loading PDF ${index + 1}:`, error);
      
      // Atualiza estado de erro de forma imutável
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

  private async loadRemainingUploadedPdfsInBackground(files: File[]) {
    const loadPromises = files.slice(1).map((file, idx) => 
      this.loadPdfFromFile(idx + 1, file)
    );

    await Promise.allSettled(loadPromises);
    console.log('[PDF Viewer] All uploaded PDFs loaded');
  }

  async loadPdfFromUrl() {
    const url = this.pdfUrl();
    if (!url) {
      this.errorMessage.set('Por favor, insira uma URL válida');
      return;
    }

    console.log('[PDF Viewer] Loading PDF from URL...');
    this.loadMultiplePdfs([url]);
  }

  async loadPdfFromData(data: ArrayBuffer, fileName: string = 'Documento') {
    try {
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
      await this.renderPage(1);
      
      console.log('[PDF Viewer] PDF uploaded successfully:', doc.totalPages, 'pages');
    } catch (error) {
      throw error;
    }
  }

  async renderPage(pageNumber: number) {
    const doc = this.activeDocument();
    if (!doc || !doc.doc) return;

    try {
      const page = await doc.doc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: this.scale() });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      await page.render(renderContext).promise;

      // Limpa o container e adiciona o novo canvas
      const container = this.pdfContainer.nativeElement;
      container.innerHTML = '';
      container.appendChild(canvas);

      this.currentPage.set(pageNumber);
    } catch (error) {
      console.error('Erro ao renderizar página:', error);
      this.errorMessage.set('Erro ao renderizar a página');
    }
  }

  // Navegação
  previousPage() {
    if (this.currentPage() > 1) {
      this.renderPage(this.currentPage() - 1);
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.renderPage(this.currentPage() + 1);
    }
  }

  // Zoom - mantém o valor entre documentos
  zoomIn() {
    this.scale.update(s => Math.min(s + 0.25, 3.0));
    this.renderPage(this.currentPage());
  }

  zoomOut() {
    this.scale.update(s => Math.max(s - 0.25, 0.5));
    this.renderPage(this.currentPage());
  }

  resetZoom() {
    this.scale.set(1.0);
    this.renderPage(this.currentPage());
  }

  // Touch/Swipe gestures
  onTouchStart(event: TouchEvent) {
    this.touchStartX = event.changedTouches[0].screenX;
  }

  onTouchEnd(event: TouchEvent) {
    this.touchEndX = event.changedTouches[0].screenX;
    this.handleSwipe();
  }

  handleSwipe() {
    const swipeThreshold = 50; // Mínimo de pixels para considerar como swipe
    const diff = this.touchStartX - this.touchEndX;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        // Swipe para esquerda - próxima página
        this.nextPage();
      } else {
        // Swipe para direita - página anterior
        this.previousPage();
      }
    }
  }

  // Navegação por teclado
  onKeyDown(event: KeyboardEvent) {
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
