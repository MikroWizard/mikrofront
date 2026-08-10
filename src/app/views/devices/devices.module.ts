import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import {
  ButtonGroupModule,
  ButtonModule,
  CardModule,
  FormModule,
  GridModule,
  NavModule,
  NavbarModule,
  CollapseModule,
  DropdownModule,
  BadgeModule,
  ToastModule,
  ModalModule,
  ListGroupModule,
  TooltipModule,
  TableModule,
} from "@coreui/angular";
import { MatMenuModule } from "@angular/material/menu";
import { DevicesRoutingModule } from "./devices-routing.module";
import { DevicesComponent } from "./devices.component";
import { SessionManagerModule } from "../session-manager/session-manager.module";
import { ConfigVersionsModule } from "../device_detail/config-versions/config-versions.module";
import { NonMikrotikComponent } from "./non-mikrotik/non-mikrotik.component";
import { TableModule as PrimeNGTableModule } from 'primeng/table';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { TooltipModule as PrimeNGTooltipModule } from 'primeng/tooltip';

import { SharedModule } from "../../shared/shared.module";

@NgModule({
  imports: [
    DevicesRoutingModule,
    CardModule,
    NavModule,
    CommonModule,
    GridModule,
    FormModule,
    ButtonModule,
    ButtonGroupModule,
    NavbarModule,
    CollapseModule,
    DropdownModule,
    BadgeModule,
    ModalModule,
    ToastModule,
    FormsModule,
    ListGroupModule,
    MatMenuModule,
    TooltipModule,
    TableModule,
    PrimeNGTableModule,
    CheckboxModule,
    InputTextModule,
    MultiSelectModule,
    PrimeNGTooltipModule,
    SessionManagerModule,
    ConfigVersionsModule,
    SharedModule
  ],
  declarations: [DevicesComponent, NonMikrotikComponent],
})
export class DevicesModule {}
