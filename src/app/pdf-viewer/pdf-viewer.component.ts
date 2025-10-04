import { Component, OnInit, OnDestroy, ViewChild, ElementRef, signal, computed } from '@angular/core';
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
  initialPage?: number; // Página inicial a ser aberta (do hash #page=N)
  hasBeenViewed?: boolean; // Flag para saber se já foi visualizado (para auto-fit)
}

@Component({
  selector: 'app-pdf-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pdf-viewer.component.html',
  styleUrls: ['./pdf-viewer.component.scss']
})
export class PdfViewerComponent implements OnInit, OnDestroy {
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
  autoFitScale = signal<number | null>(null); // Armazena o scale calculado do autofit
  isAutoFitDifferent = computed(() => {
    const autoFit = this.autoFitScale();
    const current = this.scale();
    if (autoFit === null) return false;
    // Considera diferente se a diferença for maior que 0.01
    return Math.abs(current - autoFit) > 0.01;
  });
  pdfUrl = signal('');
  isLoading = signal(false);
  errorMessage = signal('');
  isDragging = signal(false);
  pdfLoaded = signal(false);
  showInstructions = signal(false);
  pageTransitionDirection = signal<'forward' | 'backward' | 'none'>('none');
  // Quando o canvas excede o container, habilitamos scroll nativo e desativamos swipe
  isOverflowing = signal(false);
  
  // Swipe avançado com feedback visual
  swipeOffset = signal(0); // Offset atual do arrasto (px)
  isSwipingActive = signal(false); // Se está arrastando ativamente

  private touchStartX = 0;
  private touchStartY = 0;
  private touchStartTime = 0; // Tempo do início do toque
  private instructionsTimeout?: number;
  private pdfjsLib: any;
  private pdfjsReady: Promise<void>;
  private lastLoadedUrl: string = '';
  private resizeTimeout?: number; // Debounce para resize
  private devicePixelRatio: number = 1; // DPI da tela

  constructor(private route: ActivatedRoute) {
    // Inicia o carregamento do PDF.js imediatamente
    this.pdfjsReady = this.loadPdfJs();
    
    // Detecta o DPI da tela para melhorar a qualidade de renderização
    this.devicePixelRatio = window.devicePixelRatio || 1;
    console.log('[PDF Viewer] Device Pixel Ratio detected:', this.devicePixelRatio);
  }

  async ngOnInit() {
    // Aguarda o PDF.js estar pronto antes de verificar URLs
    await this.pdfjsReady;
    
    // Verifica URL na inicialização
    this.checkUrlParameter();
    
    // Monitora mudanças nos query params do Angular
    this.route.queryParams.subscribe(() => {
      this.checkUrlParameter();
    });
    
    // Monitora mudanças manuais na URL (quando usuário altera e dá enter)
    window.addEventListener('popstate', () => {
      this.checkUrlParameter();
    });
    
    // Monitora mudanças no tamanho da janela (rotação de tela, redimensionamento)
    window.addEventListener('resize', () => this.onWindowResize());
    
    // Monitora mudanças no DPI (caso o usuário mova a janela entre monitores com DPIs diferentes)
    window.matchMedia(`(resolution: ${this.devicePixelRatio}dppx)`).addEventListener('change', () => {
      this.onDpiChange();
    });
  }
  
  ngOnDestroy() {
    // Limpa os listeners quando o componente é destruído
    window.removeEventListener('resize', () => this.onWindowResize());
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    if (this.instructionsTimeout) {
      clearTimeout(this.instructionsTimeout);
    }
  }
  
  private onWindowResize() {
    // Debounce: espera 300ms após a última mudança de tamanho para re-renderizar
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    
    this.resizeTimeout = window.setTimeout(() => {
      this.handleResize();
    }, 300);
  }
  
  private async handleResize() {
    // Só re-renderiza se tiver um PDF carregado
    const doc = this.activeDocument();
    if (!doc || !doc.doc || !this.pdfLoaded()) {
      return;
    }
    
    console.log('[PDF Viewer] Window resized, re-calculating fit-to-width...');
    
    try {
      // Pega a página atual
      const page = await doc.doc.getPage(this.currentPage());
      
      // Recalcula o autofit com as novas dimensões
      await this.calculateFitToWidthScale(page);
      
      // Re-renderiza a página com o novo scale
      await this.renderPage(this.currentPage());
      
      console.log('[PDF Viewer] Page re-rendered after resize');
    } catch (error) {
      console.error('[PDF Viewer] Error handling resize:', error);
    }
  }
  
  private onDpiChange() {
    // Atualiza o DPI detectado
    const newDpi = window.devicePixelRatio || 1;
    
    if (newDpi !== this.devicePixelRatio) {
      console.log('[PDF Viewer] Device Pixel Ratio changed:', this.devicePixelRatio, '->', newDpi);
      this.devicePixelRatio = newDpi;
      
      // Re-renderiza para aproveitar a nova resolução
      this.handleResize();
    }
  }

  private checkUrlParameter() {
    // Pega a URL completa com hash (Angular Router remove o hash dos query params)
    const fullUrl = window.location.href;
    
    // Extrai os query params manualmente
    const urlParams = new URLSearchParams(window.location.search);
    const urlParam = urlParams.get('url');
    const urlsParam = urlParams.get('urls');

    if (urlsParam) {
      // Múltiplas URLs separadas por vírgula ou pipe
      const urls = urlsParam.split(/[,|]/).map((u: string) => u.trim()).filter((u: string) => u);
      
      // Cria identificador único das URLs para comparação
      const urlsKey = urls.join('|');
      
      // Só recarrega se for diferente da última carga
      if (urlsKey !== this.lastLoadedUrl) {
        console.log('[PDF Viewer] Multiple URLs detected:', urls.length);
        this.lastLoadedUrl = urlsKey;
        this.loadMultiplePdfs(urls);
      }
    } else if (urlParam) {
      // Decodifica a URL completa preservando o hash
      let decodedUrl = decodeURIComponent(urlParam);
      
      // Verifica se há hash na URL da página que foi perdido
      // Formato: ?url=PDF_URL → hash pode estar após o valor do parâmetro
      const pageUrlMatch = fullUrl.match(/[?&]url=([^&]*)/);
      if (pageUrlMatch && pageUrlMatch[1]) {
        decodedUrl = decodeURIComponent(pageUrlMatch[1]);
      }
      
      // Só recarrega se for diferente da última carga
      if (decodedUrl !== this.lastLoadedUrl) {
        console.log('[PDF Viewer] Single URL detected:', decodedUrl);
        this.lastLoadedUrl = decodedUrl;
        this.loadMultiplePdfs([decodedUrl]);
      }
    } else {
      // Limpa o último carregamento se não há mais parâmetros
      if (this.lastLoadedUrl !== '') {
        console.log('[PDF Viewer] No query param found, showing upload screen');
        this.lastLoadedUrl = '';
        // Limpa os documentos carregados
        this.pdfDocuments.set([]);
        this.pdfLoaded.set(false);
      }
    }
  }

  private async loadMultiplePdfs(urls: string[]) {
    if (urls.length === 0) return;

    // Aguarda o PDF.js estar pronto
    await this.pdfjsReady;

    // Cria os documentos
    const docs: PdfDocument[] = urls.map((url, index) => {
      // Extrai a página inicial ANTES de remover o hash
      const initialPage = this.extractPageFromUrl(url);
      
      // Remove o hash da URL para o carregamento do PDF
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
        initialPage: initialPage
      };
    });

    this.pdfDocuments.set(docs);
    this.pdfLoaded.set(true);
    this.showInstructionsTemporarily(); // Mostra instruções por 3s

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
      console.log('[PDF Viewer] Using progressive loading (Range Requests)');
      
      // Configuração para carregamento progressivo (Range Requests)
      // Isso permite baixar apenas as páginas necessárias em vez do PDF inteiro
      const loadingTask = this.pdfjsLib.getDocument({
        url: doc.url,
        // Habilita carregamento progressivo via HTTP Range Requests
        disableRange: false,        // Permite range requests (padrão: false)
        disableStream: false,       // Permite streaming (padrão: false)
        disableAutoFetch: true,     // Desabilita pre-fetch de todas as páginas
        // Tamanho do chunk para download (512 KB por vez)
        rangeChunkSize: 524288,     // 512 KB (padrão: 65536 = 64 KB)
      });
      
      // Monitora progresso do download
      loadingTask.onProgress = (progressData: any) => {
        if (progressData.total > 0) {
          const percent = Math.round((progressData.loaded / progressData.total) * 100);
          console.log(`[PDF Viewer] Download progress: ${percent}% (${progressData.loaded}/${progressData.total} bytes)`);
        }
      };
      
      const pdfDoc = await loadingTask.promise;
      console.log('[PDF Viewer] PDF metadata loaded, pages will be fetched on demand');

      // Atualiza o estado de forma imutável após carregar
      this.pdfDocuments.update(currentDocs => {
        const newDocs = [...currentDocs];
        newDocs[index] = {
          ...newDocs[index],
          doc: pdfDoc,
          totalPages: pdfDoc.numPages,
          isLoaded: true,
          isLoading: false,
          error: undefined,
          hasBeenViewed: this.activeDocumentIndex() === index // Marca como visto se é o ativo
        };
        return newDocs;
      });

      // Se é o documento ativo, renderiza
      if (this.activeDocumentIndex() === index) {
        this.totalPages.set(pdfDoc.numPages);
        
        // Usa a página inicial se especificada na URL, senão começa na página 1
        const startPage = doc.initialPage && doc.initialPage > 0 && doc.initialPage <= pdfDoc.numPages 
          ? doc.initialPage 
          : 1;
        
        if (startPage !== 1) {
          console.log(`[PDF Viewer] Opening PDF at page ${startPage} (from URL hash)`);
        }
        
        this.currentPage.set(startPage);
        // Aplica auto-fit na primeira renderização
        await this.renderPage(startPage, true);
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
      // Remove hash da URL para extrair o nome do arquivo
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
      // Verifica se há hash na URL
      if (!url.includes('#')) {
        return undefined;
      }

      // Extrai o hash
      const hash = url.split('#')[1];
      
      if (!hash) {
        return undefined;
      }
      
      // Procura por page=N no hash
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

  switchToDocument(index: number) {
    if (index < 0 || index >= this.pdfDocuments().length) return;
    if (index === this.activeDocumentIndex()) return;

    console.log(`[PDF Viewer] Switching to document ${index + 1}`);
    
    // Troca para o novo documento
    this.activeDocumentIndex.set(index);

    const doc = this.activeDocument();
    if (doc && doc.isLoaded) {
      // Restaura com o zoom atual (persistente)
      this.totalPages.set(doc.totalPages);
      
      // Usa a página inicial se especificada na URL, senão volta para página 1
      const startPage = doc.initialPage && doc.initialPage > 0 && doc.initialPage <= doc.totalPages
        ? doc.initialPage
        : 1;
      
      this.currentPage.set(startPage);
      
      // Aplica auto-fit apenas na PRIMEIRA visualização do documento
      const shouldAutoFit = !doc.hasBeenViewed;
      
      if (shouldAutoFit) {
        // Marca como visualizado
        this.pdfDocuments.update(docs => {
          const newDocs = [...docs];
          newDocs[index] = { ...newDocs[index], hasBeenViewed: true };
          return newDocs;
        });
      }
      
      // scale mantém o valor atual (persistente entre documentos)
      this.renderPage(startPage, shouldAutoFit);
    } else if (doc && !doc.isLoading) {
      // Carrega o documento se ainda não foi carregado
      this.loadPdfDocument(index);
    }
  }

  // Mostra instruções temporariamente
  private showInstructionsTemporarily() {
    // Limpa timeout anterior se existir
    if (this.instructionsTimeout) {
      clearTimeout(this.instructionsTimeout);
    }

    // Mostra as instruções
    this.showInstructions.set(true);

    // Esconde após 3 segundos
    this.instructionsTimeout = window.setTimeout(() => {
      this.showInstructions.set(false);
    }, 3000);
  }

  async loadPdfJs() {
    try {
      // Carrega a biblioteca PDF.js dinamicamente
      const pdfjs = await import('pdfjs-dist');
      this.pdfjsLib = pdfjs;
      
      // Configura o worker usando o CDN
      this.pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
      
      console.log('[PDF Viewer] PDF.js loaded successfully, version:', pdfjs.version);
    } catch (error) {
      console.error('Erro ao carregar PDF.js:', error);
      this.errorMessage.set('Erro ao inicializar o visualizador de PDF');
      throw error;
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
      // Aguarda o PDF.js estar pronto
      await this.pdfjsReady;
      
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
      this.showInstructionsTemporarily(); // Mostra instruções por 3s

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
      
      // Para arquivos locais, também podemos otimizar o carregamento
      const loadingTask = this.pdfjsLib.getDocument({
        data: arrayBuffer,
        // Desabilita pre-fetch de todas as páginas
        disableAutoFetch: true,     // Carrega páginas sob demanda
        disableStream: false,       // Mantém streaming habilitado
        disableRange: false,        // Permite range requests se possível
      });
      
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

    // Aguarda o PDF.js estar pronto
    await this.pdfjsReady;
    
    console.log('[PDF Viewer] Loading PDF from URL...');
    this.loadMultiplePdfs([url]);
  }

  async loadPdfFromData(data: ArrayBuffer, fileName: string = 'Documento') {
    try {
      // Aguarda o PDF.js estar pronto
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
      this.showInstructionsTemporarily(); // Mostra instruções por 3s
      // Aplica auto-fit na primeira renderização
      await this.renderPage(1, true);
      
      console.log('[PDF Viewer] PDF uploaded successfully:', doc.totalPages, 'pages');
    } catch (error) {
      throw error;
    }
  }

  async renderPage(pageNumber: number, applyAutoFit: boolean = false) {
    const doc = this.activeDocument();
    if (!doc || !doc.doc) return;

    try {
      const page = await doc.doc.getPage(pageNumber);
      
      // Aplica zoom adaptativo se solicitado (primeira renderização)
      if (applyAutoFit) {
        await this.calculateFitToWidthScale(page);
      }
      
      // Calcula o scale com DPI para melhor qualidade
      // Multiplica o scale pelo devicePixelRatio para renderizar em resolução nativa
      const renderScale = this.scale() * this.devicePixelRatio;
      const viewport = page.getViewport({ scale: renderScale });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      // Define o tamanho do canvas em pixels físicos (alta resolução)
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      // Define o tamanho CSS do canvas (em pixels lógicos)
      // Isso faz o canvas de alta resolução caber no espaço correto
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

  // Simplesmente substitui o canvas (sem animações)
  const container = this.pdfContainer.nativeElement;

  // Guarda posição de scroll atual (para tentar preservar após re-render)
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
  // Percentuais atuais de scroll (0..1)
  const prevScrollLeftPct = prevMaxScrollLeft > 0 ? prevScrollLeft / prevMaxScrollLeft : 0;
  const prevScrollTopPct = prevMaxScrollTop > 0 ? prevScrollTop / prevMaxScrollTop : 0;

  container.innerHTML = '';
  container.appendChild(canvas);

      // Após inserir, verificar se canvas excede o container
      // Se exceder, habilitar scroll nativo no container (overflow auto)
      // e marcar isOverflowing = true para desativar swipe
      requestAnimationFrame(() => {
        try {
          const containerRect = container.getBoundingClientRect();
          const canvasRect = canvas.getBoundingClientRect();
          const hOverflow = canvasRect.width > containerRect.width;
          const vOverflow = canvasRect.height > containerRect.height;
          const overflows = hOverflow || vOverflow;
          this.isOverflowing.set(overflows);

          // Ativa scroll nativo quando necessário
          container.style.overflow = overflows ? 'auto' : 'hidden';
          // Importante: quando há overflow horizontal, alinhar conteúdo à esquerda
          // para permitir "rolar para a esquerda" (em vez de centralizar via flex)
          (container.style as any).justifyContent = hOverflow ? 'flex-start' : 'center';
          (container.style as any).alignItems = vOverflow ? 'flex-start' : 'center';
          // Quando há overflow, permitir pan horizontal e vertical com touch
          container.style.touchAction = overflows ? 'pan-x pan-y' : 'pan-y';

          // Após definir overflow/alinhamento, tentar preservar (ou centralizar) a posição de scroll
          const newClientW = container.clientWidth;
          const newClientH = container.clientHeight;
          const newScrollW = container.scrollWidth;
          const newScrollH = container.scrollHeight;
          const newMaxScrollLeft = Math.max(0, newScrollW - newClientW);
          const newMaxScrollTop = Math.max(0, newScrollH - newClientH);

          // Estratégia:
          // - Se já havia overflow antes, preserva a proporção de scroll (evita "pular" para o canto)
          // - Se não havia e passou a ter, centraliza para permitir rolar tanto à esquerda quanto à direita
          if (hOverflow) {
            if (hadHOverflow) {
              container.scrollLeft = prevScrollLeftPct * newMaxScrollLeft;
            } else {
              container.scrollLeft = newMaxScrollLeft / 2; // centraliza horizontalmente
            }
          } else {
            container.scrollLeft = 0;
          }

          if (vOverflow) {
            if (hadVOverflow) {
              container.scrollTop = prevScrollTopPct * newMaxScrollTop;
            } else {
              container.scrollTop = 0; // mantém topo quando passar a ter overflow vertical
            }
          } else {
            container.scrollTop = 0;
          }
        } catch {}
      });

      this.currentPage.set(pageNumber);
      this.updateUrlWithCurrentPage(pageNumber);
    } catch (error) {
      console.error('Erro ao renderizar página:', error);
      this.errorMessage.set('Erro ao renderizar a página');
    }
  }

  private async calculateFitToWidthScale(page: any): Promise<void> {
    try {
      // 1. Pega dimensões originais da página (scale=1)
      const originalViewport = page.getViewport({ scale: 1.0 });
      
      // 2. Calcula largura disponível (container - padding)
      const containerWidth = this.pdfContainer.nativeElement.offsetWidth;
      const paddingTotal = 64; // 32px cada lado (2rem * 2)
      const availableWidth = containerWidth - paddingTotal;
      
      // 3. Calcula scale ideal para caber perfeitamente
      const fitScale = availableWidth / originalViewport.width;
      
  // 4. Aplica scale (limitado entre 0.5 e 9.0)
  const finalScale = Math.max(0.5, Math.min(fitScale, 9.0));
      
      // 5. Salva o autofit scale para referência futura
      this.autoFitScale.set(finalScale);
      
      // 6. Atualiza o scale global
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
      // Em caso de erro, mantém scale atual
    }
  }

  private updateUrlWithCurrentPage(pageNumber: number) {
    // Atualiza a URL para refletir a página atual
    const urlParams = new URLSearchParams(window.location.search);
    const urlParam = urlParams.get('url');
    
    if (urlParam) {
      // Remove hash antigo da URL se existir
      const cleanUrl = urlParam.split('#')[0];
      
      // Adiciona o novo hash com a página atual
      const newUrlParam = `${cleanUrl}#page=${pageNumber}`;
      
      // Atualiza a URL sem recarregar a página
      urlParams.set('url', newUrlParam);
      const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
      
      // Usa replaceState para não adicionar ao histórico
      window.history.replaceState(null, '', newUrl);
      
      console.log(`[PDF Viewer] URL updated to page ${pageNumber}`);
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

  goToPage(event: Event) {
    const input = event.target as HTMLInputElement;
    const pageNumber = parseInt(input.value, 10);
    
    // Valida o número da página
    if (isNaN(pageNumber)) {
      // Se inválido, reseta para a página atual
      input.value = this.currentPage().toString();
      return;
    }
    
    // Limita entre 1 e totalPages
    const validPage = Math.max(1, Math.min(pageNumber, this.totalPages()));
    
    // Atualiza o input com o valor válido
    input.value = validPage.toString();
    
    // Navega para a página se for diferente da atual
    if (validPage !== this.currentPage()) {
      // Define direção baseada se está avançando ou retrocedendo
      this.pageTransitionDirection.set(validPage > this.currentPage() ? 'forward' : 'backward');
      this.renderPage(validPage);
    }
  }

  // Zoom - mantém o valor entre documentos
  zoomIn() {
    this.scale.update(s => Math.min(s + 0.25, 9.0));
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

  // Fit to Width - Aplica o autofit calculado
  async fitToWidth() {
    const doc = this.activeDocument();
    if (!doc || !doc.doc) return;

    try {
      // Pega a página atual para recalcular o autofit
      const page = await doc.doc.getPage(this.currentPage());
      await this.calculateFitToWidthScale(page);
      // Renderiza com o novo scale (autofit já foi aplicado em calculateFitToWidthScale)
      await this.renderPage(this.currentPage());
      
      console.log('[PDF Viewer] Fit to width applied:', Math.round(this.scale() * 100) + '%');
    } catch (error) {
      console.error('[PDF Viewer] Error applying fit to width:', error);
    }
  }

  // Touch/Swipe gestures - Sistema avançado com feedback visual
  onTouchStart(event: TouchEvent) {
    const touch = event.changedTouches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchStartTime = Date.now();
    this.isSwipingActive.set(true);
    this.swipeOffset.set(0);
  }

  onTouchMove(event: TouchEvent) {
    if (!this.isSwipingActive()) return;
    // Se está overflowando (scroll nativo habilitado), não processar swipe
    if (this.isOverflowing()) return;
    
    const touch = event.changedTouches[0];
    const currentX = touch.clientX;
    const currentY = touch.clientY;
    
    const deltaX = currentX - this.touchStartX;
    const deltaY = currentY - this.touchStartY;
    
    // Verifica se o movimento é predominantemente horizontal
    if (Math.abs(deltaY) > Math.abs(deltaX) * 0.5) {
      // Movimento vertical, cancela swipe
      return;
    }
    
    // Aplica resistência se tentar ir além dos limites
    let offset = deltaX;
    
    // Se está na primeira página e tenta voltar
    if (this.currentPage() === 1 && deltaX > 0) {
      offset = deltaX * 0.3; // 30% de resistência
    }
    
    // Se está na última página e tenta avançar
    if (this.currentPage() === this.totalPages() && deltaX < 0) {
      offset = deltaX * 0.3; // 30% de resistência
    }
    
    this.swipeOffset.set(offset);
    
    // Previne scroll enquanto arrasta
    if (Math.abs(deltaX) > 10) {
      event.preventDefault();
    }
  }

  onTouchEnd(event: TouchEvent) {
    if (!this.isSwipingActive()) return;
    // Se está overflowando (scroll nativo habilitado), não processar swipe
    if (this.isOverflowing()) {
      this.isSwipingActive.set(false);
      this.swipeOffset.set(0);
      return;
    }
    
    const touch = event.changedTouches[0];
    const touchEndX = touch.clientX;
    const touchEndY = touch.clientY;
    const touchEndTime = Date.now();
    
    // Calcula métricas do swipe
    const horizontalDistance = Math.abs(touchEndX - this.touchStartX);
    const verticalDistance = Math.abs(touchEndY - this.touchStartY);
    const duration = touchEndTime - this.touchStartTime; // ms
    const velocity = horizontalDistance / duration; // px/ms
    
    // Verifica se o movimento é predominantemente horizontal
    if (verticalDistance > horizontalDistance * 0.5) {
      this.cancelSwipe();
      return;
    }
    
    // Calcula direção
    const swipeDirection = this.touchStartX - touchEndX;
    const isGoingForward = swipeDirection > 0;
    
    // Define se deve mudar de página baseado em:
    // 1. Velocidade alta (> 0.5 px/ms) = swipe rápido
    // 2. OU distância > 50% da tela = swipe longo
    const screenWidth = window.innerWidth;
    const isSwipeFast = velocity > 0.5; // Swipe rápido
    const isSwipeLong = horizontalDistance > screenWidth * 0.5; // Mais de 50% da tela
    
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
      // Completa o swipe - muda de página
      if (isGoingForward && this.currentPage() < this.totalPages()) {
        this.nextPage();
      } else if (!isGoingForward && this.currentPage() > 1) {
        this.previousPage();
      } else {
        this.cancelSwipe();
      }
    } else {
      // Cancela o swipe - volta à posição original
      this.cancelSwipe();
    }
    
    // Reseta estado após animação
    setTimeout(() => {
      this.isSwipingActive.set(false);
      this.swipeOffset.set(0);
    }, 300);
  }

  private cancelSwipe() {
    console.log('[PDF Viewer] Swipe cancelled - returning to original position');
    // Anima de volta para posição original
    this.swipeOffset.set(0);
  }

  handleSwipe() {
    // Método antigo - mantido para compatibilidade mas não mais usado
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
