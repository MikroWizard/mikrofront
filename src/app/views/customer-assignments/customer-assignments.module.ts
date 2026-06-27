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
import { InputTextModule } from 'primeng/inputtext';

import { CustomerAssignmentsRoutingModule } from './customer-assignments-routing.module';
import { CustomerAssignmentsComponent } from './customer-assignments.component';

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
    InputTextModule,
    CustomerAssignmentsRoutingModule
  ],
  declarations: [CustomerAssignmentsComponent]
})
export class CustomerAssignmentsModule { }
