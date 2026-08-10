import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  ButtonGroupModule,
  ButtonModule,
  CardModule,
  FormModule,
  GridModule,
  ProgressModule,
  NavbarModule,
  ModalModule,
  TableModule, 
  UtilitiesModule,
  BadgeModule,
  SpinnerModule,
  PaginationModule,
} from '@coreui/angular';
import { ChartjsModule } from '@coreui/angular-chartjs';

import { SpeedTestComponent } from './speed-test.component';

@NgModule({
  declarations: [
    SpeedTestComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    CardModule,
    GridModule,
    ProgressModule,
    FormModule,
    ButtonModule,
    ButtonGroupModule,
    NavbarModule,
    ModalModule,
    TableModule, 
    UtilitiesModule,
    BadgeModule,
    SpinnerModule,
    PaginationModule,
    ChartjsModule
  ],
  exports: [
    SpeedTestComponent
  ]
})
export class SpeedTestModule {}
