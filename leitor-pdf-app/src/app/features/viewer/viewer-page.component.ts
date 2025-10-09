import { NgFor, NgIf } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
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
  imports: [NgIf, NgFor, NgxExtendedPdfViewerModule, DocumentCarouselComponent],
  templateUrl: './viewer-page.component.html',
  styleUrl: './viewer-page.component.scss',
})
export class ViewerPageComponent implements OnDestroy {
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
      (doc) => doc.id !== current.activeId && doc.sourceType === 'url' && doc.status !== 'ready',
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

  constructor() {
    this.watchQueryParams();
    this.prefetchBackgroundDocuments();
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
    this.viewerState.markDocumentReady(docId, { pageCount: event.pagesCount });
    const rawPagesCount: unknown = (event as { pagesCount?: unknown }).pagesCount;
    const rawPageNumber: unknown = (event as { pageNumber?: unknown }).pageNumber;

    const totalPages = typeof rawPagesCount === 'number' ? rawPagesCount : this.totalPages;
    const pageNumber = typeof rawPageNumber === 'number' ? rawPageNumber : 1;

    this.totalPages = totalPages;
    this.currentPage = pageNumber;

    console.debug('[viewer] pdfLoaded', {
      docId,
      totalPages,
      pageNumber,
    });

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

  protected getDocumentSource(doc: ViewerDocument): string | File {
    if (doc.sourceType === 'file') {
      return doc.file!;
    }

    return appendTimestampToUrl(doc.url ?? '', doc.lastUpdatedAt);
  }

  private syncQueryParams(): void {
    const remoteUrls = this.documents()
      .filter((doc) => doc.sourceType === 'url' && doc.url)
      .map((doc) => doc.url!);

    const activeDoc = this.activeDocument();
    const activeId =
      activeDoc && activeDoc.sourceType === 'url' && activeDoc.url ? activeDoc.id : null;

    const queryParams: Record<string, string | null> = {
      url: null,
      urls: remoteUrls.length ? remoteUrls.join('|') : null,
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

  private watchQueryParams(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
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
      docs.documents.forEach((doc) => {
        if (doc.id === docs.activeId) {
          return;
        }

        if (doc.sourceType === 'url' && doc.status === 'idle') {
          this.viewerState.markDocumentLoading(doc.id);
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

      this.currentPage = 1;
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

    // Apply visibility settings
    if (settings.showPageNavigationButtons) {
      zone.style.display = 'block';
      zone.style.pointerEvents = 'auto';
      zone.style.background = 'rgba(0, 0, 0, 0.1)';
      zone.style.borderRadius = '8px';
      zone.style.transition = 'background-color 150ms ease-in-out';
      zone.classList.add('viewer__page-tap-zone--visible');
    } else {
      zone.style.display = 'none';
      zone.style.pointerEvents = 'none';
      zone.classList.remove('viewer__page-tap-zone--visible');
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
        console.log('[PDF Viewer] Toolbar encontrado:', toolbar);
        console.log('[PDF Viewer] Estrutura do toolbar:', toolbar?.innerHTML);
        this.injectCustomMenuItems(host);
      } else {
        console.log('[PDF Viewer] Aguardando toolbar...');
        // Tentar novamente após um tempo
        setTimeout(checkForMenu, 500);
      }
    };

    checkForMenu();
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

    // Verificar se já adicionamos o botão
    if (toolbar.querySelector('.viewer__custom-nav-button')) return;

    console.log('[PDF Viewer] Procurando elementos de referência...');

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

    console.log('[PDF Viewer] Hamburger button:', hamburgerButton);
    console.log('[PDF Viewer] Search button:', searchButton);
    
    // Debug: listar todos os botões disponíveis
    const allButtons = toolbar.querySelectorAll('button, pdf-shy-button');
    console.log('[PDF Viewer] Todos os botões encontrados:', allButtons);
    allButtons.forEach((btn, index) => {
      const htmlBtn = btn as HTMLElement;
      console.log(`[PDF Viewer] Botão ${index}:`, {
        id: htmlBtn.id,
        title: htmlBtn.title,
        className: htmlBtn.className,
        tagName: htmlBtn.tagName,
        l10nid: htmlBtn.getAttribute('l10nid'),
        innerHTML: htmlBtn.innerHTML.substring(0, 100) + '...'
      });
    });

    // Criar botão toggle único
    const toggleButton = this.createToggleButton();

    // Posicionar de forma mais simples e segura
    if (hamburgerButton && hamburgerButton.parentNode) {
      console.log('[PDF Viewer] Inserindo à direita do hamburger');
      // Inserir logo após o hamburger
      hamburgerButton.parentNode.insertBefore(toggleButton, hamburgerButton.nextSibling);
    } else {
      console.log('[PDF Viewer] Fallback: inserindo no início do toolbar');
      // Fallback: inserir no início do toolbar
      const toolbarViewer = toolbar.querySelector('#toolbarViewer') || toolbar.querySelector('.toolbarViewer');
      if (toolbarViewer) {
        toolbarViewer.insertBefore(toggleButton, toolbarViewer.firstChild);
      } else {
        toolbar.insertBefore(toggleButton, toolbar.firstChild);
      }
    }

    console.log('[PDF Viewer] Botão criado e inserido:', toggleButton);
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
    button.title = 'Atalhos de navegação';
    
    const isActive = this.viewerSettingsSnapshot().showPageNavigationButtons;
    
    // Usar ícone mais simples e visível
    const iconSpan = document.createElement('span');
    iconSpan.className = 'toolbarButtonIcon';
    
    // Usar ícone Unicode mais simples
    iconSpan.textContent = '📄';
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
               const newState = this.viewerSettingsSnapshot();
               button.style.background = newState.showPageNavigationButtons ? 'rgba(212, 175, 55, 0.3)' : 'transparent';
               
               // Atualizar tooltip
               button.title = newState.showPageNavigationButtons ? 'Ocultar atalhos de navegação' : 'Mostrar atalhos de navegação';
             }, 100);
    });

    return button;
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
  const values: string[] = [];

  if (urlsParam) {
    values.push(...urlsParam.split(/[|,]/));
  } else if (fallbackUrl) {
    values.push(fallbackUrl);
  }

  return values.map((value) => value.trim()).filter(Boolean);
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
