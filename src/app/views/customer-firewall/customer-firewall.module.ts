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
  DropdownModule,
  NavModule,
  TabsModule,
  BadgeModule,
  TooltipModule
} from '@coreui/angular';

import { CustomerFirewallRoutingModule } from './customer-firewall-routing.module';
import { CustomerFirewallComponent } from './customer-firewall.component';

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
    NavModule,
    TabsModule,
    BadgeModule,
    TooltipModule,
    CustomerFirewallRoutingModule
  ],
  declarations: [CustomerFirewallComponent]
})
export class CustomerFirewallModule { }
