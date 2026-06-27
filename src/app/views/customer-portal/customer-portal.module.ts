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
  DropdownModule,
  ButtonGroupModule
} from '@coreui/angular';
import { TooltipModule } from 'primeng/tooltip';
import { TableModule } from 'primeng/table';

import { CustomerPortalRoutingModule } from './customer-portal-routing.module';
import { CustomerPortalComponent } from './customer-portal.component';
import { WidgetsModule } from '../widgets/widgets.module';

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
    ButtonGroupModule,
    TooltipModule,
    TableModule,
    CustomerPortalRoutingModule,
    WidgetsModule
  ],
  declarations: [CustomerPortalComponent]
})
export class CustomerPortalModule { }
