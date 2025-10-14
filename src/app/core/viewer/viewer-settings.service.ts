import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ViewerSettings {
  showPageNavigationButtons: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ViewerSettingsService {
  private readonly STORAGE_KEY = 'pdf-viewer-settings';
  
  private readonly settingsSubject = new BehaviorSubject<ViewerSettings>(this.loadSettings());

  readonly settings$ = this.settingsSubject.asObservable();
  readonly settings = signal<ViewerSettings>(this.loadSettings());

  constructor() {
    // Carregar configurações salvas
    this.loadSettings();
  }

  get snapshot(): ViewerSettings {
    return this.settingsSubject.value;
  }

  private loadSettings(): ViewerSettings {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          showPageNavigationButtons: parsed.showPageNavigationButtons ?? true,
        };
      }
    } catch (error) {
      console.warn('Erro ao carregar configurações do viewer:', error);
    }
    
    return {
      showPageNavigationButtons: true, // Padrão: habilitado
    };
  }

  private saveSettings(settings: ViewerSettings): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.warn('Erro ao salvar configurações do viewer:', error);
    }
  }

  updateSettings(updates: Partial<ViewerSettings>): void {
    const currentSettings = this.settingsSubject.value;
    const newSettings = { ...currentSettings, ...updates };
    
    this.settingsSubject.next(newSettings);
    this.settings.set(newSettings);
    this.saveSettings(newSettings);
  }

  togglePageNavigationButtons(): void {
    const current = this.settingsSubject.value;
    this.updateSettings({
      showPageNavigationButtons: !current.showPageNavigationButtons,
    });
  }

  shouldShowNavigationButtons(): boolean {
    const current = this.settingsSubject.value;
    return current.showPageNavigationButtons;
  }
}
