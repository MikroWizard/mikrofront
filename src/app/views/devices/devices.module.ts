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
} from "@coreui/angular";
import { MatMenuModule } from "@angular/material/menu";
import { DevicesRoutingModule } from "./devices-routing.module";
import { DevicesComponent } from "./devices.component";
import { GuiGridModule } from "@generic-ui/ngx-grid";

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
    GuiGridModule,
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
  ],
  declarations: [DevicesComponent],
})
export class DevicesModule {}
