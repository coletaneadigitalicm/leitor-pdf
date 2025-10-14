import { Provider } from '@angular/core';

import { AppConfig } from './app-config.model';
import { APP_CONFIG } from './app-config.token';
import { DEFAULT_APP_CONFIG } from './default-app-config';

export function provideAppConfig(config: Partial<AppConfig> = {}): Provider {
  return {
    provide: APP_CONFIG,
    useValue: mergeConfig(config),
  };
}

function mergeConfig(overrides: Partial<AppConfig>): AppConfig {
  return {
    ...DEFAULT_APP_CONFIG,
    ...overrides,
    theme: {
      ...DEFAULT_APP_CONFIG.theme,
      ...overrides.theme,
    },
    typography: {
      ...DEFAULT_APP_CONFIG.typography,
      ...overrides.typography,
    },
    layout: {
      ...DEFAULT_APP_CONFIG.layout,
      ...overrides.layout,
      breakpoints: {
        ...DEFAULT_APP_CONFIG.layout.breakpoints,
        ...overrides.layout?.breakpoints,
      },
      toolbar: {
        ...DEFAULT_APP_CONFIG.layout.toolbar,
        ...overrides.layout?.toolbar,
        height: {
          ...DEFAULT_APP_CONFIG.layout.toolbar.height,
          ...overrides.layout?.toolbar?.height,
        },
      },
    },
    viewer: {
      ...DEFAULT_APP_CONFIG.viewer,
      ...overrides.viewer,
    },
  };
}
