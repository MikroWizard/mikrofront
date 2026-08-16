import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface LicenseState {
  status: 'ok' | 'free' | 'expired' | 'invalid' | 'over_limit';
  reason?: string | null;
  counts?: { mikrotik?: number; other?: number };
  limits?: { mikrotik?: number; other?: number; pam_seats?: number };
  expiration?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class LicenseService {
  private isExpiredSubject = new BehaviorSubject<boolean>(false);
  public isExpired$: Observable<boolean> = this.isExpiredSubject.asObservable();

  private licenseStateSubject = new BehaviorSubject<LicenseState>({ status: 'ok' });
  public licenseState$: Observable<LicenseState> = this.licenseStateSubject.asObservable();

  constructor() { }

  setExpired(expired: boolean): void {
    if (this.isExpiredSubject.value !== expired) {
      this.isExpiredSubject.next(expired);
    }
  }

  isExpired(): boolean {
    return this.isExpiredSubject.value;
  }

  setLicenseState(state: LicenseState | undefined | null): void {
    if (!state) {
      return;
    }
    this.licenseStateSubject.next(state);
    const blocked = state.status === 'expired' || state.status === 'invalid' || state.status === 'over_limit';
    this.setExpired(blocked);
  }

  getLicenseState(): LicenseState {
    return this.licenseStateSubject.value;
  }

  isBlocked(): boolean {
    const s = this.licenseStateSubject.value;
    return s.status === 'expired' || s.status === 'invalid' || s.status === 'over_limit';
  }

  isOverLimit(): boolean {
    return this.licenseStateSubject.value.status === 'over_limit';
  }
}
