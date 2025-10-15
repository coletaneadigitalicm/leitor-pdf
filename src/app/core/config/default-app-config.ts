import { AppConfig } from './app-config.model';

export const DEFAULT_APP_CONFIG: AppConfig = {
  appTitle: 'Leitor Digital 2.0',
  theme: {
    background: '#4B2D2B',
    card: '#FFF8E1',
    cardSoft: '#f8f9fa',
    title: '#6A2F2F',
    gold: '#D4AF37',
    placeholder: '#F0E68C',
    button: '#6A3B39',
    textLight: '#FFFFFF',
    textDark: '#2B211F',
    badgeBlue: '#617799',
    badgeGray: '#D1D5DB',
  },
  typography: {
    titleFamily: '"EB Garamond", serif',
    bodyFamily: '"Open Sans", sans-serif',
  },
  layout: {
    breakpoints: {
      desktop: 1024,
      tablet: 768,
      mobile: 480,
    },
    toolbar: {
      height: {
        desktop: 80,
        mobile: 64,
      },
      elevation: '0 6px 12px rgba(0, 0, 0, 0.35)',
    },
    contentMaxWidth: 1440,
  },
  viewer: {
    showPageNavigationButtons: true,
  },
};
