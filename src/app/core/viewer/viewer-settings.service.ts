import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ViewerSettings {
  showPageNavigationButtons: boolean;
  autoDisableNavigationOnZoom: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ViewerSettingsService {
  private readonly STORAGE_KEY = 'pdf-viewer-settings';
  
  private readonly settingsSubject = new BehaviorSubject<ViewerSettings>({
    showPageNavigationButtons: true,
    autoDisableNavigationOnZoom: true,
  });

  readonly settings$ = this.settingsSubject.asObservable();
  readonly settings = signal<ViewerSettings>({
    showPageNavigationButtons: true,
    autoDisableNavigationOnZoom: true,
  });

  constructor() {
    // Carregar configurações salvas
    const settings = this.loadSettings();
    console.log('[ViewerSettings] Configurações carregadas:', settings);
    this.settingsSubject.next(settings);
    this.settings.set(settings);
  }

  get snapshot(): ViewerSettings {
    return this.settingsSubject.value;
  }

  private loadSettings(): ViewerSettings {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      console.log('[ViewerSettings] localStorage raw:', saved);
      
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('[ViewerSettings] localStorage parsed:', parsed);
        
        const settings = {
          showPageNavigationButtons: parsed.showPageNavigationButtons ?? true,
          autoDisableNavigationOnZoom: parsed.autoDisableNavigationOnZoom ?? true,
        };
        
        console.log('[ViewerSettings] Settings final:', settings);
        return settings;
      } else {
        console.log('[ViewerSettings] Nenhuma configuração salva, usando padrões');
      }
    } catch (error) {
      console.warn('Erro ao carregar configurações do viewer:', error);
    }
    
    const defaultSettings = {
      showPageNavigationButtons: true, // Padrão: habilitado
      autoDisableNavigationOnZoom: true, // Padrão: habilitado
    };
    
    console.log('[ViewerSettings] Retornando configurações padrão:', defaultSettings);
    return defaultSettings;
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
