import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  CardModule,
  ButtonModule,
  GridModule,
  SpinnerModule,
  ProgressModule,
  BadgeModule
} from '@coreui/angular';
import { ChartjsModule } from '@coreui/angular-chartjs';
import { TooltipModule } from 'primeng/tooltip';

import { CustomerSpeedTestRoutingModule } from './customer-speedtest-routing.module';
import { CustomerSpeedTestComponent } from './customer-speedtest.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    GridModule,
    SpinnerModule,
    ProgressModule,
    BadgeModule,
    ChartjsModule,
    TooltipModule,
    CustomerSpeedTestRoutingModule
  ],
  declarations: [CustomerSpeedTestComponent]
})
export class CustomerSpeedTestModule { }
