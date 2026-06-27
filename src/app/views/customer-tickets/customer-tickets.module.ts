import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import {
  CardModule,
  ButtonModule,
  FormModule,
  GridModule,
  ModalModule,
  SpinnerModule,
  DropdownModule
} from '@coreui/angular';
import { TooltipModule } from 'primeng/tooltip';
import { TableModule } from 'primeng/table';

import { CustomerTicketsRoutingModule } from './customer-tickets-routing.module';
import { CustomerTicketsComponent } from './customer-tickets.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    FormModule,
    GridModule,
    ModalModule,
    SpinnerModule,
    DropdownModule,
    TooltipModule,
    TableModule,
    CustomerTicketsRoutingModule
  ],
  declarations: [CustomerTicketsComponent]
})
export class CustomerTicketsModule { }
