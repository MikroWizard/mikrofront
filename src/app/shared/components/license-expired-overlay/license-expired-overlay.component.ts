import { Component, OnInit } from '@angular/core';
import { LicenseService } from '../../../providers/license.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-license-expired-overlay',
  templateUrl: './license-expired-overlay.component.html',
  styleUrls: ['./license-expired-overlay.component.scss']
})
export class LicenseExpiredOverlayComponent implements OnInit {
  public isExpired$: Observable<boolean>;

  constructor(private licenseService: LicenseService) {
    this.isExpired$ = this.licenseService.isExpired$;
  }

  ngOnInit(): void {
  }

  dismiss(): void {
    // Locally hide the overlay for the current component session if needed
    // But usually, it should stay until the license is fixed.
  }
}
