import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LicenseExpiredOverlayComponent } from './components/license-expired-overlay/license-expired-overlay.component';

@NgModule({
  declarations: [
    LicenseExpiredOverlayComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    LicenseExpiredOverlayComponent
  ]
})
export class SharedModule { }
