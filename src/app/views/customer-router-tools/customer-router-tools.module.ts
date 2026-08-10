import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import {
  CardModule,
  ButtonModule,
  GridModule,
  SpinnerModule,
  FormModule,
  AlertModule,
  AccordionModule,
  SharedModule,
  ModalModule
} from '@coreui/angular';
import { TooltipModule } from 'primeng/tooltip';

import { CustomerRouterToolsRoutingModule } from './customer-router-tools-routing.module';
import { CustomerRouterToolsComponent } from './customer-router-tools.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    GridModule,
    SpinnerModule,
    FormModule,
    AlertModule,
    AccordionModule,
    SharedModule,
    TooltipModule,
    CustomerRouterToolsRoutingModule,
    ModalModule
  ],
  declarations: [CustomerRouterToolsComponent],
  exports: [CustomerRouterToolsComponent]
})
export class CustomerRouterToolsModule { }
