import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AlertsComponent } from './alerts.component';
import { AlertsRoutingModule } from './alerts-routing.module';

import { TableModule } from 'primeng/table';

import {
  ButtonModule,
  ButtonGroupModule,
  CardModule,
  FormModule,
  GridModule,
  SpinnerModule,
  ModalModule,
  TooltipModule,
  TabsModule,
  BadgeModule,
  DropdownModule,
  ToastModule
} from '@coreui/angular';
import { IconModule } from '@coreui/icons-angular';

@NgModule({
  imports: [
    CommonModule,
    AlertsRoutingModule,
    CardModule,
    GridModule,
    ButtonModule,
    ButtonGroupModule,
    FormModule,
    FormsModule,
    SpinnerModule,
    ModalModule,
    TooltipModule,
    TabsModule,
    BadgeModule,
    DropdownModule,
    ToastModule,
    IconModule,
    TableModule
  ],
  declarations: [AlertsComponent]
})
export class AlertsModule { }
