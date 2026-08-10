import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { dataProvider } from '../../providers/mikrowizard/data';

export interface TerminalSettings {
  fontFamily: string;
  fontSize: number;
  cursorStyle: 'block' | 'underline' | 'bar';
  cursorBlink: boolean;
  background: string;
  foreground: string;
  cursorColor: string;
  selectionBackground: string;
}

export interface SessionInitResponse {
  status: string;
  token: string;
  gateway_url: string;
  session_id: string;
  protocol?: string;
}

export const DEFAULT_TERMINAL_SETTINGS: TerminalSettings = {
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
  fontSize: 14,
  cursorStyle: 'block',
  cursorBlink: true,
  background: '#0a0a0f',
  foreground: '#ececf2',
  cursorColor: '#00ffd0',
  selectionBackground: '#00ffd066',
};

const SETTINGS_STORAGE_KEY = 'mikrowizard_terminal_settings';

@Injectable({ providedIn: 'root' })
export class TerminalService {
  constructor(private data_provider: dataProvider) {}

  initSession(deviceId: number, brand?: string): Promise<SessionInitResponse> {
    return this.data_provider.MikroWizardRPC.sendJsonRequest('/api/terminal/init', {
      device_id: deviceId,
      device_brand: brand || 'mikrotik',
    });
  }

  loadLocalSettings(): TerminalSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        return { ...DEFAULT_TERMINAL_SETTINGS, ...JSON.parse(raw) };
      }
    } catch (e) {
      console.warn('Failed to load terminal settings from localStorage', e);
    }
    return { ...DEFAULT_TERMINAL_SETTINGS };
  }

  saveLocalSettings(settings: TerminalSettings): void {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save terminal settings to localStorage', e);
    }
  }
}
