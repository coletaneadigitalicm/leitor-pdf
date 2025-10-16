import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AppConfigService } from '../config/app-config.service';
import { GitSubmoduleService } from '../config/git-submodule.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet],
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
  
  // Use signal to avoid ExpressionChangedAfterItHasBeenCheckedError
  protected readonly isGitSubmodule = signal(false);
  
  protected readonly backgroundStyle = {
    background: `linear-gradient(135deg, ${this.theme.background} 0%, #3a201f 100%)`,
  };

  constructor() {
    // Subscribe to git submodule changes and update signal
    this.gitSubmoduleService.isGitSubmodule$.subscribe(value => {
      this.isGitSubmodule.set(value);
    });
  }
}
