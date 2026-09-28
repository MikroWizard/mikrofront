import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type UiMode = 'both' | 'mikrotik' | 'pam';

@Injectable({
  providedIn: 'root'
})
export class UiModeService {
  private modeSubject: BehaviorSubject<UiMode>;
  public mode$: Observable<UiMode>;

  constructor() {
    const saved = localStorage.getItem('mw_ui_mode') as UiMode;
    const initialMode: UiMode = (saved === 'mikrotik' || saved === 'pam' || saved === 'both') ? saved : 'both';
    this.modeSubject = new BehaviorSubject<UiMode>(initialMode);
    this.mode$ = this.modeSubject.asObservable();
  }

  get currentMode(): UiMode {
    return this.modeSubject.value;
  }

  get showMikrotik(): boolean {
    const m = this.modeSubject.value;
    return m === 'both' || m === 'mikrotik';
  }

  get showPam(): boolean {
    const m = this.modeSubject.value;
    return m === 'both' || m === 'pam';
  }

  setMode(mode: UiMode): void {
    if (this.modeSubject.value !== mode) {
      this.modeSubject.next(mode);
      localStorage.setItem('mw_ui_mode', mode);
    }
  }

  isModeVisible(target: string | string[]): boolean {
    const current = this.modeSubject.value;
    if (target === 'mikrotik') {
      return current === 'both' || current === 'mikrotik';
    }
    if (target === 'pam') {
      return current === 'both' || current === 'pam';
    }
    if (target === 'mikrotik-only') {
      return current === 'mikrotik';
    }
    if (target === 'pam-only') {
      return current === 'pam';
    }
    if (target === 'both') {
      return true;
    }
    if (Array.isArray(target)) {
      return target.some(t => {
        if (t === 'mikrotik') return current === 'both' || current === 'mikrotik';
        if (t === 'pam') return current === 'both' || current === 'pam';
        return t === current || t === 'both';
      });
    }
    return true;
  }
}
