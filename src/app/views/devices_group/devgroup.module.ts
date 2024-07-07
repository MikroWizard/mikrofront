import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";

import {
  ButtonGroupModule,
  ButtonModule,
  CardModule,
  FormModule,
  GridModule,
  CollapseModule,
  ModalModule,
} from "@coreui/angular";
import { DevicesGroupRoutingModule } from "./devgroup-routing.module";
import { DevicesGroupComponent } from "./devgroup.component";
import { GuiGridModule } from "@generic-ui/ngx-grid";
import { BadgeModule } from "@coreui/angular";
import { FormsModule } from "@angular/forms";
@NgModule({
  imports: [
    DevicesGroupRoutingModule,
    CardModule,
    CommonModule,
    GridModule,
    FormsModule,
    FormModule,
    ButtonModule,
    ButtonGroupModule,
    GuiGridModule,
    CollapseModule,
    ModalModule,
    BadgeModule,
  ],
  declarations: [DevicesGroupComponent],
})
export class DevicesGroupModule {}
