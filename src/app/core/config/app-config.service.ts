import { inject, Injectable } from '@angular/core';

import { AppConfig } from './app-config.model';
import { APP_CONFIG } from './app-config.token';

@Injectable({
  providedIn: 'root',
})
export class AppConfigService {
  private readonly config = inject(APP_CONFIG);

  getAppTitle(): string {
    return this.config.appTitle;
  }

  getTheme() {
    return this.config.theme;
  }

  getTypography() {
    return this.config.typography;
  }

  getLayout() {
    return this.config.layout;
  }

  getViewerOptions() {
    return this.config.viewer;
  }

  getConfig(): AppConfig {
    return this.config;
  }
}
