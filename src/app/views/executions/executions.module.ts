import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  ButtonGroupModule,
  ButtonModule,
  CardModule,
  FormModule,
  GridModule,
  BadgeModule,
  SpinnerModule,
  PaginationModule,
  ToastModule,
  ModalModule,
  TableModule,
} from '@coreui/angular';
import { TableModule as PTableModule } from 'primeng/table';
import { InputTextModule as PInputTextModule } from 'primeng/inputtext';
import { TooltipModule as PTooltipModule } from 'primeng/tooltip';

import { MatDatepickerModule } from '@angular/material/datepicker';

import { ExecutionsRoutingModule } from './executions-routing.module';
import { ExecutionsComponent } from './executions.component';

import { SharedModule } from '../../shared/shared.module';

@NgModule({
  imports: [
    ExecutionsRoutingModule,
    CommonModule,
    FormsModule,
    CardModule,
    GridModule,
    FormModule,
    ButtonModule,
    ButtonGroupModule,
    BadgeModule,
    SpinnerModule,
    PaginationModule,
    ToastModule,
    ModalModule,
    TableModule,
    PTableModule,
    PInputTextModule,
    PTooltipModule,
    MatDatepickerModule,
    SharedModule
  ],
  declarations: [ExecutionsComponent],
})
export class ExecutionsModule {}
