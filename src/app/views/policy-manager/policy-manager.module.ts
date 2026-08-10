import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import {
  BadgeModule,
  ButtonModule,
  CardModule,
  FormModule,
  GridModule,
  ModalModule,
  ButtonGroupModule,
  ToastModule,
  TooltipModule,
  NavModule,
  TabsModule
} from '@coreui/angular';
import { PolicyManagerRoutingModule } from './policy-manager-routing.module';
import { PolicyManagerComponent } from './policy-manager.component';
import { TableModule as PTableModule } from 'primeng/table';
import { InputTextModule as PInputTextModule } from 'primeng/inputtext';
import { TooltipModule as PTooltipModule } from 'primeng/tooltip';

import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  imports: [
    PolicyManagerRoutingModule,
    BadgeModule,
    CardModule,
    CommonModule,
    GridModule,
    FormModule,
    ButtonModule,
    ButtonGroupModule,
    PTableModule,
    PInputTextModule,
    PTooltipModule,
    ModalModule,
    ReactiveFormsModule,
    FormsModule,
    ToastModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    SharedModule,
    NavModule,
    TabsModule
  ],
  declarations: [PolicyManagerComponent],
})
export class PolicyManagerModule {}