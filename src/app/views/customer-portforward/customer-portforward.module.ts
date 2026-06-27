import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import {
  CardModule,
  ButtonModule,
  FormModule,
  GridModule,
  SpinnerModule,
  ModalModule,
  DropdownModule
} from '@coreui/angular';
import { TooltipModule } from 'primeng/tooltip';

import { CustomerPortForwardRoutingModule } from './customer-portforward-routing.module';
import { CustomerPortForwardComponent } from './customer-portforward.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    FormModule,
    GridModule,
    SpinnerModule,
    ModalModule,
    DropdownModule,
    TooltipModule,
    CustomerPortForwardRoutingModule
  ],
  declarations: [CustomerPortForwardComponent]
})
export class CustomerPortForwardModule { }
