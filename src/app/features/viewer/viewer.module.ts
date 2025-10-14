import { NgModule } from '@angular/core';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';

import { ViewerPageComponent } from './viewer-page.component';
import { DocumentCarouselComponent } from './document-carousel.component';
import { ViewerStateService } from '../../core/viewer/viewer-state.service';
import { ViewerSettingsService } from '../../core/viewer/viewer-settings.service';

/**
 * PdfViewerModule
 * 
 * Módulo reutilizável para visualização de PDFs com suporte a:
 * - Múltiplos documentos em tabs
 * - Navegação por cantos (corner tap zones)
 * - Configurações persistidas
 * - Uso offline com service workers
 * - Query params e inputs programáticos
 */
@NgModule({
  imports: [
    ViewerPageComponent,
    DocumentCarouselComponent,
    NgxExtendedPdfViewerModule,
  ],
  exports: [
    ViewerPageComponent,
    DocumentCarouselComponent,
  ],
  providers: [
    ViewerStateService,
    ViewerSettingsService,
  ]
})
export class PdfViewerModule { }

