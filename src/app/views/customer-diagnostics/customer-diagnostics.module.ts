import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  CardModule,
  ButtonModule,
  FormModule,
  GridModule,
  SpinnerModule,
  DropdownModule
} from '@coreui/angular';
import { TooltipModule } from 'primeng/tooltip';

import { CustomerDiagnosticsRoutingModule } from './customer-diagnostics-routing.module';
import { CustomerDiagnosticsComponent } from './customer-diagnostics.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    FormModule,
    GridModule,
    SpinnerModule,
    DropdownModule,
    TooltipModule,
    CustomerDiagnosticsRoutingModule
  ],
  declarations: [CustomerDiagnosticsComponent]
})
export class CustomerDiagnosticsModule { }
