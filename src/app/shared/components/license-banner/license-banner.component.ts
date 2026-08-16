import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LicenseService, LicenseState } from '../../../providers/license.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-license-banner',
  templateUrl: './license-banner.component.html',
  styleUrls: ['./license-banner.component.scss']
})
export class LicenseBannerComponent implements OnInit {
  public state$: Observable<LicenseState>;

  constructor(public licenseService: LicenseService, private router: Router) {
    this.state$ = this.licenseService.licenseState$;
  }

  ngOnInit(): void {}

  goToDevices(): void {
    this.router.navigate(['/devices']);
  }
}
