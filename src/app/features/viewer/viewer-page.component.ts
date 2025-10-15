import { NgIf } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  Signal,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  NgxExtendedPdfViewerModule,
  PdfLoadedEvent,
  ScrollModeType,
} from 'ngx-extended-pdf-viewer';

import { ViewerStateService } from '../../core/viewer/viewer-state.service';
import { ViewerDocument } from '../../core/viewer/viewer-state.model';
import { createInitialViewerState } from '../../core/viewer/viewer-state.util';
import { ViewerSettingsService } from '../../core/viewer/viewer-settings.service';
import { DocumentCarouselComponent } from './document-carousel.component';

@Component({
  selector: 'app-viewer-page',
  standalone: true,
  imports: [NgIf, NgxExtendedPdfViewerModule, DocumentCarouselComponent],
  templateUrl: './viewer-page.component.html',
  styleUrl: './viewer-page.component.scss',
})
export class ViewerPageComponent implements OnDestroy {
  // Inputs para uso programático (melhor para offline/service workers)
  @Input() urls?: string[];  // URLs to load
  @Input() activeDocumentId?: string;  // Which document to show initially
  
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly viewerState = inject(ViewerStateService);
  private readonly viewerSettings = inject(ViewerSettingsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);

  @ViewChild('pdfViewer', { read: ElementRef })
  private pdfViewerRef?: ElementRef<HTMLElement>;

  private readonly paramSyncSuppressed = signal(false);

  protected currentPage = 1;
  protected totalPages = 0;
  protected readonly pageScrollMode = ScrollModeType.page;

  protected readonly state = toSignal(this.viewerState.state$, {
    initialValue: createInitialViewerState(),
  });

  protected readonly documents: Signal<ViewerDocument[]> = computed(() => this.state().documents);

  protected readonly activeDocument: Signal<ViewerDocument | null> = computed(() => {
    const currentState = this.state();
    return currentState.documents.find((doc) => doc.id === currentState.activeId) ?? null;
  });

  protected readonly backgroundDocuments: Signal<ViewerDocument[]> = computed(() => {
    const current = this.state();
    return current.documents.filter(
      (doc) => doc.id !== current.activeId && 
               doc.sourceType === 'url' && 
               doc.status === 'loading'
    );
  });

  protected readonly isLoading: Signal<boolean> = computed(() => this.state().status === 'loading');

  protected readonly hasError: Signal<boolean> = computed(
    () => this.state().status === 'error' && Boolean(this.state().error),
  );

  protected readonly activeError: Signal<string | null> = computed(() => this.state().error);

  protected readonly hasDocuments: Signal<boolean> = computed(() => this.documents().length > 0);

  protected readonly viewerSettingsSnapshot = toSignal(this.viewerSettings.settings$, {
    initialValue: this.viewerSettings.snapshot,
  });

  private tapZoneObserver?: MutationObserver;
  private autoDisabledNavigation = false; // Track if navigation was auto-disabled on zoom

  constructor() {
    this.watchInputChanges();
    this.watchQueryParams();
    this.resetPaginationOnDocumentChange();
    this.watchViewerSettingsChanges();
  }

  protected retry(): void {
    const doc = this.activeDocument();
    if (!doc) {
      return;
    }

    if (doc.sourceType === 'url') {
      this.viewerState.markDocumentLoading(doc.id);
      this.viewerState.addDocumentFromUrl(doc.url ?? '', { setActive: true });
      this.syncQueryParams();
      return;
    }

    // Para arquivos locais, redefinimos o estado para permitir nova tentativa manual.
    this.viewerState.markDocumentLoading(doc.id);
  }

  protected togglePageNavigationButtons(): void {
    // Clear auto-disabled flag when user manually toggles
    this.autoDisabledNavigation = false;
    this.viewerSettings.togglePageNavigationButtons();
  }

  protected clearError(): void {
    const doc = this.activeDocument();
    if (!doc) {
      return;
    }

    this.viewerState.markDocumentLoading(doc.id);
  }

  protected onDocumentSelected(documentId: string): void {
    this.viewerState.setActiveDocument(documentId);
    this.syncQueryParams();
  }

  protected onDocumentClosed(documentId: string): void {
    this.viewerState.closeDocument(documentId);
    this.syncQueryParams();
  }

  protected onPdfLoaded(docId: string, event: PdfLoadedEvent): void {
    const doc = this.state().documents.find(d => d.id === docId);
    console.log('[PDF-LOADED]', {
      docId,
      docName: doc?.name,
      pagesCount: event.pagesCount,
      isActive: docId === this.state().activeId,
      allDocs: this.state().documents.map(d => ({ name: d.name, id: d.id, status: d.status }))
    });
    
    this.viewerState.markDocumentReady(docId, { pageCount: event.pagesCount });
    
    const totalPages = event.pagesCount;
    
    this.totalPages = totalPages;
    
    // Usar initialPage do documento
    if (doc?.initialPage && doc.initialPage <= totalPages) {
      this.currentPage = doc.initialPage;
    } else {
      this.currentPage = 1;
    }

    if (this.activeDocument()?.id === docId) {
      this.updatePageTapZones();
      
      // Adicionar opções ao menu nativo após carregar
      setTimeout(() => {
        this.addCustomOptionsToNativeMenu();
      }, 1000);
    }
  }

  protected onPdfLoadFailed(docId: string, event: unknown): void {
    const message = inferErrorMessage(event);
    this.viewerState.markDocumentError(docId, message);
  }

  protected onPageChange(page: number): void {
    console.debug('[viewer] pageChange emitted', { page });
    this.currentPage = page;
    this.updatePageTapZones();
  }

  protected onZoomChange(zoom: string | number | undefined): void {
    const settings = this.viewerSettingsSnapshot();
    
    // Only auto-disable if feature is enabled in settings
    if (!settings.autoDisableNavigationOnZoom) {
      return;
    }
    
    const isPageWidth = this.isPageWidthZoom(zoom);
    
    if (!isPageWidth) {
      // User zoomed - auto-disable if currently enabled
      if (settings.showPageNavigationButtons) {
        this.autoDisabledNavigation = true;
        this.viewerSettings.updateSettings({ showPageNavigationButtons: false });
      }
    } else {
      // Back to page-width - re-enable if we auto-disabled
      if (this.autoDisabledNavigation) {
        this.autoDisabledNavigation = false;
        this.viewerSettings.updateSettings({ showPageNavigationButtons: true });
      }
    }
  }

  private isPageWidthZoom(zoomLevel: string | number | undefined): boolean {
    if (!zoomLevel) return true; // Consider undefined as page-width (default)
    return zoomLevel === 'auto' || zoomLevel === 'page-width';
  }

  protected getDocumentSource(doc: ViewerDocument): string | File {
    if (doc.sourceType === 'file') {
      return doc.file!;
    }

    // Retornar URL diretamente sem timestamp para evitar re-renderização infinita
    // O timestamp será adicionado apenas quando necessário
    return doc.url ?? '';
  }

  private syncQueryParams(): void {
    const remoteUrls = this.documents()
      .filter((doc) => doc.sourceType === 'url' && doc.url)
      .map((doc) => doc.url!);

    const activeDoc = this.activeDocument();
    const activeId =
      activeDoc && activeDoc.sourceType === 'url' && activeDoc.url ? activeDoc.id : null;

    // Usar Base64 para ambos os parâmetros para consistência
    const urlsString = remoteUrls.length ? remoteUrls.join('|') : null;
    const encodedUrls = urlsString ? btoa(urlsString) : null;
    
    // Para single URL, usar o primeiro URL se houver apenas um
    const singleUrl = remoteUrls.length === 1 ? remoteUrls[0] : null;
    const encodedSingleUrl = singleUrl ? btoa(singleUrl) : null;

    const queryParams: Record<string, string | null> = {
      url: encodedSingleUrl,
      urls: encodedUrls,
      active: activeId,
    };

    this.paramSyncSuppressed.set(true);
    void this.router
      .navigate([], {
        relativeTo: this.route,
        queryParams,
        queryParamsHandling: 'merge',
      })
      .finally(() => this.paramSyncSuppressed.set(false));
  }

  private watchInputChanges(): void {
    effect(() => {
      // Observar mudanças nos inputs (urls e activeDocumentId)
      const inputUrls = this.urls;
      const inputActiveId = this.activeDocumentId;
      
      // Inputs têm prioridade sobre query params para melhor suporte offline
      if (inputUrls && inputUrls.length > 0) {
        console.log('[INPUT-URLS] Applying from inputs:', inputUrls);
        this.viewerState.applyExternalSources(inputUrls, inputActiveId ?? null);
        // Suprimir sync de query params quando usando inputs
        this.paramSyncSuppressed.set(true);
      }
    });
  }

  private watchQueryParams(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      console.log('[WATCH-PARAMS] All params:', params.keys);
      console.log('[WATCH-PARAMS] urls param:', params.get('urls'));
      console.log('[WATCH-PARAMS] url param:', params.get('url'));
      
      if (this.paramSyncSuppressed()) {
        return;
      }

      const hasUrls = params.has('urls');
      const hasUrl = params.has('url');

      if (!hasUrls && !hasUrl) {
        return;
      }

      const urlsParam = params.get('urls');
      const fallbackUrl = params.get('url');
      const activeId = params.get('active');

      const urls = parseUrlsParam(urlsParam, fallbackUrl);

      if (!urls.length) {
        this.viewerState.applyExternalSources([], null);
        return;
      }

      this.viewerState.applyExternalSources(urls, activeId);
    });
  }

  protected onCornerTap(position: 'left' | 'right'): void {
    if (position === 'right') {
      this.goToNextPage();
    } else {
      this.goToPreviousPage();
    }
  }

  private prefetchBackgroundDocuments(): void {
    effect(() => {
      const docs = this.state();
      const activeDoc = docs.documents.find(d => d.id === docs.activeId);
      
      console.log('[PREFETCH] Active doc:', activeDoc?.name, 'Status:', activeDoc?.status);
      
      // NÃO carregar nenhum documento de background se o ativo ainda está loading
      if (activeDoc?.status === 'loading') {
        console.log('[PREFETCH] Active still loading, skip background');
        return;
      }
      
      // Carregar apenas 1 documento por vez para evitar conflito de IDs no DOM
      let hasLoadingBackground = false;
      
      docs.documents.forEach((doc, index) => {
        if (doc.id === docs.activeId) {
          console.log(`[PREFETCH] Doc ${index}: Skip (active)`, doc.name);
          return;
        }

        // Se já há um documento de background carregando, não iniciar outro
        if (doc.sourceType === 'url' && doc.status === 'loading') {
          hasLoadingBackground = true;
          console.log(`[PREFETCH] Doc ${index}: Already loading`, doc.name);
        }

        if (doc.sourceType === 'url' && doc.status === 'idle' && !hasLoadingBackground) {
          console.log(`[PREFETCH] Doc ${index}: Mark as loading`, doc.name, doc.id);
          this.viewerState.markDocumentLoading(doc.id);
          hasLoadingBackground = true;
        } else if (doc.status === 'idle') {
          console.log(`[PREFETCH] Doc ${index}: Skip (waiting)`, doc.name);
        }
      });
    });
  }

  private resetPaginationOnDocumentChange(): void {
    effect(() => {
      const doc = this.activeDocument();
      
      if (!doc) {
        this.currentPage = 1;
        this.totalPages = 0;
        return;
      }

      // Usar initialPage se disponível e documento ainda não carregado
      if (doc.initialPage && doc.status !== 'ready') {
        this.currentPage = doc.initialPage;
      } else if (doc.status === 'ready') {
        // Manter página atual se já carregado
      } else {
        this.currentPage = 1;
      }
      
      this.totalPages = doc.pageCount ?? 0;
      this.updatePageTapZones();
    });
  }

  private watchViewerSettingsChanges(): void {
    effect(() => {
      // React to viewer settings changes
      this.viewerSettingsSnapshot();
      this.updatePageTapZones();
    });
  }

  private updatePageTapZones(): void {
    requestAnimationFrame(() => {
      const host = this.pdfViewerRef?.nativeElement;
      if (!host) {
        return;
      }

      this.initTapZoneObserver(host);

      const wrappers = host.querySelectorAll<HTMLElement>('.canvasWrapper');
      wrappers.forEach((wrapper) => this.ensurePageTapZones(wrapper));
    });
  }

  private ensurePageTapZones(wrapper: HTMLElement): void {
    if (getComputedStyle(wrapper).position === 'static') {
      wrapper.style.position = 'relative';
    }

    const existingZones = Array.from(
      wrapper.querySelectorAll<HTMLElement>('[data-viewer-page-tap-zone="true"]'),
    );

    if (!existingZones.length) {
      this.createPageTapZone(wrapper, 'left', 'top');
      this.createPageTapZone(wrapper, 'left', 'bottom');
      this.createPageTapZone(wrapper, 'right', 'top');
      this.createPageTapZone(wrapper, 'right', 'bottom');
      wrapper.dataset['viewerTapZones'] = 'true';
    } else {
      existingZones.forEach((zone) => this.applyTapZoneStyles(wrapper, zone));
    }
  }

  private createPageTapZone(
    wrapper: HTMLElement,
    horizontal: 'left' | 'right',
    vertical: 'top' | 'bottom',
  ): void {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `viewer__page-tap-zone viewer__page-tap-zone--${horizontal} viewer__page-tap-zone--${vertical}`;
    button.setAttribute('data-viewer-page-tap-zone', 'true');
    button.setAttribute('aria-label', horizontal === 'right' ? 'Avancar pagina' : 'Voltar pagina');
    button.dataset['viewerTapZoneHorizontal'] = horizontal;
    button.dataset['viewerTapZoneVertical'] = vertical;

    button.addEventListener('click', () => {
      this.ngZone.run(() => this.onCornerTap(horizontal));
    });

    this.applyTapZoneStyles(wrapper, button);
    wrapper.appendChild(button);
  }

  private applyTapZoneStyles(wrapper: HTMLElement, zone: HTMLElement): void {
    const rect = wrapper.getBoundingClientRect();
    const width = Math.max(rect.width * 0.28, 120);
    const height = Math.max(rect.height * 0.28, 120);
    const settings = this.viewerSettingsSnapshot();

    zone.style.position = 'absolute';
    zone.style.width = `${width}px`;
    zone.style.height = `${height}px`;
    zone.style.minWidth = `${width}px`;
    zone.style.minHeight = `${height}px`;
    zone.style.border = 'none';
    zone.style.padding = '0';
    zone.style.cursor = 'pointer';
    zone.style.zIndex = '2';

    // Apply functionality settings - zones are always invisible
    zone.style.display = 'block';
    zone.style.opacity = '0'; // Always invisible
    zone.style.background = 'transparent';
    zone.style.borderRadius = '8px';
    
    if (settings.showPageNavigationButtons) {
      // Enabled: invisible but functional
      zone.style.pointerEvents = 'auto';
      zone.classList.add('viewer__page-tap-zone--enabled');
    } else {
      // Disabled: invisible and non-functional
      zone.style.pointerEvents = 'none';
      zone.classList.remove('viewer__page-tap-zone--enabled');
    }

    const horizontal = zone.dataset['viewerTapZoneHorizontal'] as 'left' | 'right' | undefined;
    const vertical = zone.dataset['viewerTapZoneVertical'] as 'top' | 'bottom' | undefined;

    if (horizontal === 'left') {
      zone.style.left = '0';
      zone.style.right = '';
    } else if (horizontal === 'right') {
      zone.style.right = '0';
      zone.style.left = '';
    }

    if (vertical === 'top') {
      zone.style.top = '0';
      zone.style.bottom = '';
    } else if (vertical === 'bottom') {
      zone.style.bottom = '0';
      zone.style.top = '';
    }
  }

  private initTapZoneObserver(host: HTMLElement): void {
    if (this.tapZoneObserver) {
      return;
    }

    this.tapZoneObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        Array.from(mutation.addedNodes).forEach((node) => {
          if (!(node instanceof HTMLElement)) {
            return;
          }

          if (node.matches('.canvasWrapper')) {
            this.ensurePageTapZones(node);
          }

          node.querySelectorAll<HTMLElement>('.canvasWrapper').forEach((wrapper) => {
            this.ensurePageTapZones(wrapper);
          });
        });

        if (mutation.type === 'attributes' && mutation.target instanceof HTMLElement) {
          if (mutation.target.matches('.canvasWrapper')) {
            this.ensurePageTapZones(mutation.target);
          }
        }
      });
    });

    this.tapZoneObserver.observe(host, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    });
  }

  private goToNextPage(): void {
    if (this.currentPage >= this.totalPages) {
      console.debug('[viewer] next page blocked', {
        currentPage: this.currentPage,
        totalPages: this.totalPages,
      });
      return;
    }

    this.currentPage += 1;
    console.debug('[viewer] next page', { page: this.currentPage });
  }

  private goToPreviousPage(): void {
    if (this.currentPage <= 1) {
      console.debug('[viewer] previous page blocked', {
        currentPage: this.currentPage,
      });
      return;
    }

    this.currentPage -= 1;
    console.debug('[viewer] previous page', { page: this.currentPage });
  }

  private addCustomOptionsToNativeMenu(): void {
    const host = this.pdfViewerRef?.nativeElement;
    if (!host) return;

    // Aguardar o PDF viewer estar completamente carregado
    const checkForMenu = () => {
      const toolbar = host.querySelector('#toolbarContainer') || host.querySelector('.toolbar');
      const secondaryToolbar = host.querySelector('#secondaryToolbar') || host.querySelector('.secondaryToolbar');
      
      if (toolbar || secondaryToolbar) {
        this.injectCustomMenuItems(host);
        this.setupSettingsChangeListener(host);
      } else {
        // Tentar novamente após um tempo
        setTimeout(checkForMenu, 500);
      }
    };

    checkForMenu();
  }

  private setupSettingsChangeListener(host: HTMLElement): void {
    // Listen for settings changes and update button visual state
    this.viewerSettings.settings$.subscribe(() => {
      const toggleButton = host.querySelector('[data-viewer-nav-toggle="true"]') as HTMLElement;
      if (toggleButton) {
        this.updateToggleButtonVisualState(toggleButton);
      }
    });
  }

  private injectCustomMenuItems(host: HTMLElement): void {
    // Tentar encontrar o menu de configurações existente
    const existingMenu = host.querySelector('#viewBookmark') || 
                        host.querySelector('[title*="Propriedades"]') ||
                        host.querySelector('[title*="Properties"]') ||
                        host.querySelector('.toolbarButton[title*="Configurações"]');

    if (existingMenu) {
      // Adicionar nossos botões ao lado do menu existente
      this.addCustomButtonsToToolbar(host);
    } else {
      // Criar um novo botão de menu
      this.createCustomMenuButton(host);
    }
  }

  private addCustomButtonsToToolbar(host: HTMLElement): void {
    const toolbar = host.querySelector('#toolbarContainer') || host.querySelector('.toolbar');
    if (!toolbar) return;

    // Remover botões existentes para evitar duplicatas
    const existingNavButton = toolbar.querySelector('.viewer__custom-nav-button');
    const existingSettingsButton = toolbar.querySelector('.viewer__custom-settings-button');
    
    if (existingNavButton) {
      existingNavButton.remove();
    }
    
    if (existingSettingsButton) {
      existingSettingsButton.remove();
    }

    // Encontrar elementos de referência para posicionamento
    const hamburgerButton = toolbar.querySelector('#sidebarToggle') || 
                           toolbar.querySelector('[title*="Sidebar"]') ||
                           toolbar.querySelector('[title*="Menu"]') ||
                           toolbar.querySelector('.toolbarButton[title*="Toggle"]') ||
                           toolbar.querySelector('button[aria-label*="sidebar"]') ||
                           toolbar.querySelector('button[aria-label*="menu"]');

    const searchButton = toolbar.querySelector('#viewFind') || 
                        toolbar.querySelector('#secondaryFind') ||
                        toolbar.querySelector('[title*="Pesquisar"]') ||
                        toolbar.querySelector('[title*="Search"]') ||
                        toolbar.querySelector('[title*="Find"]') ||
                        toolbar.querySelector('.toolbarButton[title*="Find"]') ||
                        toolbar.querySelector('button[aria-label*="find"]') ||
                        toolbar.querySelector('button[aria-label*="search"]') ||
                        toolbar.querySelector('pdf-shy-button[l10nid*="find"]') ||
                        toolbar.querySelector('pdf-shy-button[l10nid*="search"]') ||
                        toolbar.querySelector('button[id*="Find"]') ||
                        toolbar.querySelector('button[id*="Search"]');

    // Encontrar botão de Desenho (Drawing/Annotation)
    const drawingButton = toolbar.querySelector('#editorFreeText') ||
                         toolbar.querySelector('#editorInk') ||
                         toolbar.querySelector('[title*="Desenho"]') ||
                         toolbar.querySelector('[title*="Drawing"]') ||
                         toolbar.querySelector('[title*="Annotation"]') ||
                         toolbar.querySelector('[title*="Anotação"]') ||
                         toolbar.querySelector('button[aria-label*="draw"]') ||
                         toolbar.querySelector('button[aria-label*="annotation"]');

    // Encontrar botão de Ferramentas (Tools)
    const toolsButton = toolbar.querySelector('#secondaryToolbarToggle') ||
                       toolbar.querySelector('[title*="Ferramentas"]') ||
                       toolbar.querySelector('[title*="Tools"]') ||
                       toolbar.querySelector('[title*="More"]') ||
                               toolbar.querySelector('button[aria-label*="tools"]') ||
                               toolbar.querySelector('button[aria-label*="more"]');

    // Criar botão toggle único
    const toggleButton = this.createToggleButton();
    
    // Criar botão de configurações
    const settingsButton = this.createSettingsButton();

    // Posicionar entre Desenho e Ferramentas (posição mais intuitiva)
    if (drawingButton && toolsButton && drawingButton.parentNode === toolsButton.parentNode && drawingButton.parentNode) {
      // Verificar se são filhos do mesmo pai antes de inserir
      const parent = drawingButton.parentNode;
      parent.insertBefore(toggleButton, toolsButton);
      parent.insertBefore(settingsButton, toolsButton);
    } else if (drawingButton && drawingButton.parentNode) {
      // Se não encontrar Ferramentas ou forem de pais diferentes, inserir após Desenho
      const parent = drawingButton.parentNode;
      parent.insertBefore(toggleButton, drawingButton.nextSibling);
      parent.insertBefore(settingsButton, toggleButton.nextSibling);
    } else if (hamburgerButton && hamburgerButton.parentNode) {
      // Fallback: inserir logo após o hamburger
      const parent = hamburgerButton.parentNode;
      parent.insertBefore(toggleButton, hamburgerButton.nextSibling);
      parent.insertBefore(settingsButton, toggleButton.nextSibling);
    } else {
      // Fallback final: inserir no início do toolbar
      const toolbarViewer = toolbar.querySelector('#toolbarViewer') || toolbar.querySelector('.toolbarViewer');
      if (toolbarViewer) {
        toolbarViewer.insertBefore(toggleButton, toolbarViewer.firstChild);
        toolbarViewer.insertBefore(settingsButton, toggleButton.nextSibling);
      } else {
        toolbar.insertBefore(toggleButton, toolbar.firstChild);
        toolbar.insertBefore(settingsButton, toggleButton.nextSibling);
      }
    }
  }

  private createCustomMenuButton(host: HTMLElement): void {
    const toolbar = host.querySelector('#toolbarContainer') || host.querySelector('.toolbar');
    if (!toolbar) return;

    // Verificar se já criamos o botão
    if (toolbar.querySelector('.viewer__custom-menu-button')) return;

    const menuButton = document.createElement('button');
    menuButton.className = 'toolbarButton viewer__custom-menu-button';
    menuButton.title = 'Opções de navegação';
    menuButton.innerHTML = `
      <span class="toolbarButtonIcon">⚙</span>
      <span class="toolbarButtonLabel">Navegação</span>
    `;

    // Adicionar estilos
    menuButton.style.cssText = `
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid rgba(0, 0, 0, 0.2);
      border-radius: 4px;
      margin-left: 0.5rem;
      cursor: pointer;
      transition: all 150ms ease-in-out;
    `;

    menuButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleCustomNavigationMenu(host);
    });

    // Inserir no toolbar
    const toolbarViewer = toolbar.querySelector('#toolbarViewer') || toolbar.querySelector('.toolbarViewer');
    if (toolbarViewer) {
      toolbarViewer.appendChild(menuButton);
    } else {
      toolbar.appendChild(menuButton);
    }
  }

  private createToggleButton(): HTMLElement {
    const button = document.createElement('button');
    button.className = 'toolbarButton viewer__custom-nav-button';
    button.title = 'Navegação por cantos';
    button.dataset['viewerNavToggle'] = 'true';
    
    const settings = this.viewerSettingsSnapshot();
    const isActive = settings.showPageNavigationButtons;
    
    // Usar ícone de setas bidirecionais
    const iconSpan = document.createElement('span');
    iconSpan.className = 'toolbarButtonIcon';
    
    // Usar ícone de setas bidirecionais ⇄
    iconSpan.textContent = '⇄';
    iconSpan.style.cssText = `
      font-size: 16px;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
    `;

    button.appendChild(iconSpan);

    // Aplicar estilos similares aos botões nativos
    button.style.cssText = `
      background: ${isActive ? 'rgba(212, 175, 55, 0.3)' : 'transparent'};
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: all 150ms ease-in-out;
      padding: 0;
      margin: 0 4px;
      width: 28px;
      height: 28px;
      display: inline-block;
      vertical-align: top;
      box-sizing: border-box;
      position: relative;
    `;

    // Adicionar hover effect
    button.addEventListener('mouseenter', () => {
      button.style.background = isActive ? 'rgba(212, 175, 55, 1)' : 'rgba(255, 255, 255, 1)';
    });

    button.addEventListener('mouseleave', () => {
      const currentState = this.viewerSettingsSnapshot().showPageNavigationButtons;
      button.style.background = currentState ? 'rgba(212, 175, 55, 0.3)' : 'transparent';
    });

    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.togglePageNavigationButtons();
      
             // Atualizar estado visual
             setTimeout(() => {
               this.updateToggleButtonVisualState(button);
             }, 100);
    });

    return button;
  }

  private updateToggleButtonVisualState(button: HTMLElement): void {
    const newState = this.viewerSettingsSnapshot();
    button.style.background = newState.showPageNavigationButtons ? 'rgba(212, 175, 55, 0.3)' : 'transparent';
    
    // Atualizar tooltip
    button.title = newState.showPageNavigationButtons ? 'Desabilitar navegação por cantos' : 'Habilitar navegação por cantos';
  }

  private createSettingsButton(): HTMLElement {
    const button = document.createElement('button');
    button.className = 'toolbarButton viewer__custom-settings-button';
    button.title = 'Configurações de navegação';
    button.dataset['viewerSettingsButton'] = 'true';
    
    // Usar ícone de três pontos horizontais
    const iconSpan = document.createElement('span');
    iconSpan.className = 'toolbarButtonIcon';
    iconSpan.textContent = '⋯';
    iconSpan.style.cssText = `
      font-size: 16px;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
    `;

    button.appendChild(iconSpan);

    // Aplicar estilos similares aos botões nativos
    button.style.cssText = `
      background: transparent;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: all 150ms ease-in-out;
      padding: 0;
      margin: 0 4px;
      width: 28px;
      height: 28px;
      display: inline-block;
      vertical-align: top;
      box-sizing: border-box;
      position: relative;
    `;

    // Adicionar hover effect
    button.addEventListener('mouseenter', () => {
      button.style.background = 'rgba(255, 255, 255, 0.1)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.background = 'transparent';
    });

    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleSettingsMenu(button);
    });

    return button;
  }

  private toggleSettingsMenu(button: HTMLElement): void {
    // Verificar se já existe um menu
    const existingMenu = document.querySelector('.viewer__settings-menu');
    if (existingMenu) {
      existingMenu.remove();
      return;
    }

    // Criar menu de configurações
    const menu = document.createElement('div');
    menu.className = 'viewer__settings-menu';
    menu.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      margin-top: 4px;
      background: white;
      border: 1px solid rgba(0, 0, 0, 0.2);
      border-radius: 4px;
      padding: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      min-width: 250px;
      font-size: 13px;
      color: #333;
    `;

    const settings = this.viewerSettingsSnapshot();

    // Criar checkbox para auto-disable
    const label = document.createElement('label');
    label.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      padding: 4px;
      user-select: none;
    `;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = settings.autoDisableNavigationOnZoom;
    checkbox.style.cssText = `
      cursor: pointer;
      width: 16px;
      height: 16px;
    `;

    const labelText = document.createElement('span');
    labelText.textContent = 'Desabilitar navegação ao dar zoom';
    labelText.style.cssText = `
      flex: 1;
    `;

    label.appendChild(checkbox);
    label.appendChild(labelText);
    menu.appendChild(label);

    // Posicionar menu relativo ao botão com detecção de overflow
    const buttonRect = button.getBoundingClientRect();
    const menuWidth = 250; // min-width definido no CSS
    const menuHeight = 60; // Altura estimada do menu
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calcular posição X para evitar overflow horizontal
    let menuLeft = buttonRect.left;
    if (menuLeft + menuWidth > viewportWidth) {
      // Se vai sair pela direita, alinhar à direita do botão
      menuLeft = buttonRect.right - menuWidth;
    }
    
    // Garantir que não saia pela esquerda
    if (menuLeft < 0) {
      menuLeft = 8; // Margem mínima da borda
    }
    
    // Calcular posição Y para evitar overflow vertical
    let menuTop = buttonRect.bottom + 4;
    if (menuTop + menuHeight > viewportHeight) {
      // Se vai sair por baixo, mostrar acima do botão
      menuTop = buttonRect.top - menuHeight - 4;
    }
    
    menu.style.position = 'fixed';
    menu.style.top = `${menuTop}px`;
    menu.style.left = `${menuLeft}px`;

    // Adicionar event listener para checkbox
    checkbox.addEventListener('change', () => {
      this.ngZone.run(() => {
        this.viewerSettings.updateSettings({ 
          autoDisableNavigationOnZoom: checkbox.checked 
        });
      });
    });

    // Fechar menu ao clicar fora
    const closeMenu = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node) && e.target !== button) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };

    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 0);

    document.body.appendChild(menu);
  }

  private toggleCustomNavigationMenu(host: HTMLElement): void {
    // Implementar dropdown menu se necessário
    console.log('Toggle custom navigation menu');
  }


  ngOnDestroy(): void {
    this.tapZoneObserver?.disconnect();
    this.tapZoneObserver = undefined;
  }
}

function parseUrlsParam(urlsParam: string | null, fallbackUrl: string | null): string[] {
  console.log('[PARSE-URLS] Raw urlsParam:', urlsParam);
  console.log('[PARSE-URLS] Raw fallbackUrl:', fallbackUrl);
  
  const values: string[] = [];

  if (urlsParam) {
    let decoded = urlsParam;
    
    // Verificar se está em Base64
    // Base64 válido: apenas [A-Za-z0-9+/=-] e comprimento múltiplo de 4 (com padding)
    // URLs sempre contêm "://" então não são Base64
    const looksLikeBase64 = !urlsParam.includes('://') && 
                           /^[A-Za-z0-9+/=-]+$/.test(urlsParam) &&
                           urlsParam.length > 20; // Base64 de URLs seria longo
    
    if (looksLikeBase64) {
      try {
        decoded = atob(urlsParam);
        console.log('[PARSE-URLS] Decoded from Base64:', decoded);
      } catch (e) {
        console.error('[PARSE-URLS] Base64 decode failed:', e);
        decoded = urlsParam;
      }
    } else {
      // Não é Base64, pode ser URL direta ou encoded
      try {
        decoded = decodeURIComponent(urlsParam);
        console.log('[PARSE-URLS] Decoded from URI component');
      } catch (e) {
        decoded = urlsParam;
      }
    }
    
    // Split por vírgula ou pipe
    const split = decoded.split(/[|,]/);
    console.log('[PARSE-URLS] Split into', split.length, 'URLs');
    
    values.push(...split);
  } else if (fallbackUrl) {
    // Aplicar a mesma lógica de Base64 para o fallbackUrl (?url)
    let decodedFallback = fallbackUrl;
    
    const looksLikeBase64 = !fallbackUrl.includes('://') && 
                           /^[A-Za-z0-9+/=-]+$/.test(fallbackUrl) &&
                           fallbackUrl.length > 20;
    
    if (looksLikeBase64) {
      try {
        decodedFallback = atob(fallbackUrl);
        console.log('[PARSE-URLS] Decoded fallbackUrl from Base64:', decodedFallback);
      } catch (e) {
        console.error('[PARSE-URLS] Base64 decode failed for fallbackUrl:', e);
        decodedFallback = fallbackUrl;
      }
    } else {
      // Não é Base64, pode ser URL direta ou encoded
      try {
        decodedFallback = decodeURIComponent(fallbackUrl);
        console.log('[PARSE-URLS] Decoded fallbackUrl from URI component');
      } catch (e) {
        decodedFallback = fallbackUrl;
      }
    }
    
    values.push(decodedFallback);
  }

  const result = values.map((value) => value.trim()).filter(Boolean);
  console.log('[PARSE-URLS] Final:', result.length, 'valid URLs');
  
  return result;
}

function appendTimestampToUrl(url: string, timestamp: number): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('ts', String(timestamp));
    return parsed.toString();
  } catch {
    return url;
  }
}

function inferErrorMessage(event: unknown): string {
  if (typeof event === 'string') {
    return event;
  }

  if (
    event &&
    typeof event === 'object' &&
    'message' in event &&
    typeof (event as { message: unknown }).message === 'string'
  ) {
    return (event as { message: string }).message;
  }

  return 'Nao conseguimos carregar o PDF. Verifique se a URL esta acessivel e com permissoes CORS.';
}
