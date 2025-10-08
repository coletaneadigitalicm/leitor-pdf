import { NgFor } from '@angular/common';
import { Component, inject } from '@angular/core';

import { AppConfigService } from '../../core/config/app-config.service';

interface Highlight {
  title: string;
  description: string;
  meta: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [NgFor],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private readonly appConfig = inject(AppConfigService);
  protected readonly layout = this.appConfig.getLayout();
  protected readonly highlights: Highlight[] = [
    {
      title: 'Arquitetura em camadas',
      description:
        'Core, Shared e Features prontos para receber serviços, componentes reutilizáveis e fluxos específicos do leitor.',
      meta: 'Fase 2 — Estrutura base',
    },
    {
      title: 'Tema Coletânea Digital',
      description:
        'Paleta, tipografia e sombras aplicadas globalmente para manter a identidade visual consistente.',
      meta: 'Fase 2 — Design tokens',
    },
    {
      title: 'Layout responsivo',
      description:
        'Toolbar fixa, superfície clara e espaçamentos calibrados para desktop, tablet e mobile.',
      meta: `Breakpoints: ≥${this.layout.breakpoints.desktop}px · ≥${this.layout.breakpoints.tablet}px · <${this.layout.breakpoints.mobile}px`,
    },
  ];
}
