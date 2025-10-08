import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AppConfigService } from '../config/app-config.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  private readonly appConfigService = inject(AppConfigService);
  protected readonly layout = this.appConfigService.getLayout();
  protected readonly theme = this.appConfigService.getTheme();
  protected readonly appTitle = this.appConfigService.getAppTitle();
  protected readonly typography = this.appConfigService.getTypography();
  protected readonly backgroundStyle = {
    background: `linear-gradient(135deg, ${this.theme.background} 0%, #3a201f 100%)`,
  };
}
