import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LicenseService {
  private isExpiredSubject = new BehaviorSubject<boolean>(false);
  public isExpired$: Observable<boolean> = this.isExpiredSubject.asObservable();

  constructor() { }

  setExpired(expired: boolean): void {
    if (this.isExpiredSubject.value !== expired) {
      this.isExpiredSubject.next(expired);
    }
  }

  isExpired(): boolean {
    return this.isExpiredSubject.value;
  }
}
