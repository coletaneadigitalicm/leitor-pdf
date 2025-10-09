export interface ThemePalette {
  background: string;
  card: string;
  cardSoft: string;
  title: string;
  gold: string;
  placeholder: string;
  button: string;
  textLight: string;
  textDark: string;
  badgeBlue: string;
  badgeGray: string;
}

export interface LayoutBreakpoints {
  desktop: number;
  tablet: number;
  mobile: number;
}

export interface ToolbarLayout {
  height: {
    desktop: number;
    mobile: number;
  };
  elevation: string;
}

export interface AppLayoutConfig {
  breakpoints: LayoutBreakpoints;
  toolbar: ToolbarLayout;
  contentMaxWidth: number;
}

export interface ViewerOptions {
  showPageNavigationButtons: boolean;
}

export interface AppConfig {
  appTitle: string;
  theme: ThemePalette;
  typography: {
    titleFamily: string;
    bodyFamily: string;
  };
  layout: AppLayoutConfig;
  viewer: ViewerOptions;
}
