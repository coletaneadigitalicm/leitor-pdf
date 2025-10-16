import { Component, inject, signal, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
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
export class ShellComponent implements OnInit, OnDestroy {
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
  
  @ViewChild('appShell', { static: true })
  appShellRef!: ElementRef<HTMLElement>;
  
  private resizeObserver?: ResizeObserver;
  private lastReportedHeight = 0;

  constructor() {
    // Subscribe to git submodule changes and update signal
    this.gitSubmoduleService.isGitSubmodule$.subscribe(value => {
      this.isGitSubmodule.set(value);
    });
  }
  
  ngOnInit(): void {
    // Setup ResizeObserver to report height changes to parent
    this.setupHeightReporting();
  }
  
  ngOnDestroy(): void {
    // Clean up ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }
  
  private setupHeightReporting(): void {
    // Only report height if we're in an iframe (git submodule mode)
    if (!this.isGitSubmodule()) {
      return;
    }
    
    if (!this.appShellRef?.nativeElement) {
      return;
    }
    
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = Math.ceil(entry.contentRect.height);
        
        // Only report if height changed significantly (avoid spam)
        if (Math.abs(height - this.lastReportedHeight) > 5) {
          this.reportHeightToParent(height);
          this.lastReportedHeight = height;
        }
      }
    });
    
    this.resizeObserver.observe(this.appShellRef.nativeElement);
    
    // Initial height report
    setTimeout(() => {
      const initialHeight = this.appShellRef.nativeElement.offsetHeight;
      this.reportHeightToParent(initialHeight);
      this.lastReportedHeight = initialHeight;
    }, 100);
  }
  
  private reportHeightToParent(height: number): void {
    // Check if we're in an iframe
    if (window.parent === window) {
      return;
    }
    
    try {
      const message = {
        type: 'IFRAME_HEIGHT_UPDATE',
        height: height
      };
      
      window.parent.postMessage(message, '*');
      
      console.log('📏 Shell: Height reported to parent:', {
        height,
        isGitSubmodule: this.isGitSubmodule()
      });
    } catch (error) {
      console.warn('📏 Shell: Failed to report height to parent:', error);
    }
  }
}
