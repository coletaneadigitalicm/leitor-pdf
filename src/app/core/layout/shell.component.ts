import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterOutlet } from '@angular/router';

import { AppConfigService } from '../config/app-config.service';
import { GitSubmoduleService } from '../config/git-submodule.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, AsyncPipe],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  private readonly appConfigService = inject(AppConfigService);
  private readonly gitSubmoduleService = inject(GitSubmoduleService);
  
  protected readonly layout = this.appConfigService.getLayout();
  protected readonly theme = this.appConfigService.getTheme();
  protected readonly appTitle = this.appConfigService.getAppTitle();
  protected readonly typography = this.appConfigService.getTypography();
  protected readonly isGitSubmodule = this.gitSubmoduleService.isGitSubmodule$;
  protected readonly backgroundStyle = {
    background: `linear-gradient(135deg, ${this.theme.background} 0%, #3a201f 100%)`,
  };
}
