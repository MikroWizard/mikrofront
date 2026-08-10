import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ModalModule,
  ButtonModule,
  FormModule,
  GridModule,
  BadgeModule,
  TableModule,
  ButtonGroupModule
} from '@coreui/angular';

import { LicenseExpiredOverlayComponent } from './components/license-expired-overlay/license-expired-overlay.component';
import { ExportModalComponent } from './components/export-modal/export-modal.component';

@NgModule({
  declarations: [
    LicenseExpiredOverlayComponent,
    ExportModalComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ModalModule,
    ButtonModule,
    FormModule,
    GridModule,
    BadgeModule,
    TableModule,
    ButtonGroupModule
  ],
  exports: [
    LicenseExpiredOverlayComponent,
    ExportModalComponent,
    CommonModule,
    FormsModule
  ]
})
export class SharedModule { }
