import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";

import {
  ButtonGroupModule,
  ButtonModule,
  CardModule,
  FormModule,
  GridModule,
  ProgressModule,
  NavbarModule,
  AlertModule,
  ModalModule,
  TableModule, 
  UtilitiesModule,
  BadgeModule
} from "@coreui/angular";
import { ChartjsModule } from "@coreui/angular-chartjs";

import { DeviceRoutingModule } from "./device-routing.module";
import { DeviceComponent } from "./device.component";
import { GuiGridModule } from "@generic-ui/ngx-grid";

import { WidgetsModule } from "../widgets/widgets.module";

@NgModule({
  imports: [
    DeviceRoutingModule,
    CardModule,
    AlertModule,
    CommonModule,
    GridModule,
    ProgressModule,
    FormModule,
    ButtonModule,
    ButtonGroupModule,
    ChartjsModule,
    WidgetsModule,
    GuiGridModule,
    NavbarModule,
    ModalModule,
    TableModule, 
    UtilitiesModule,
    BadgeModule
  ],
  declarations: [DeviceComponent],
})
export class DeviceModule {}
