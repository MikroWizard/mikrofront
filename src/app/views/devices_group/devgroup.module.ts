import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";

import {
  AlertModule,
  ButtonGroupModule,
  ButtonModule,
  CardModule,
  FormModule,
  GridModule,
  CollapseModule,
  ModalModule,
  TooltipModule,
  ListGroupModule,
} from "@coreui/angular";
import { DevicesGroupRoutingModule } from "./devgroup-routing.module";
import { DevicesGroupComponent } from "./devgroup.component";
import { TableModule as PTableModule } from 'primeng/table';
import { InputTextModule as PInputTextModule } from 'primeng/inputtext';
import { TooltipModule as PTooltipModule } from 'primeng/tooltip';
import { BadgeModule } from "@coreui/angular";
import { FormsModule } from "@angular/forms";
import { MatMenuModule } from "@angular/material/menu";
import { SharedModule } from "../../shared/shared.module";

@NgModule({
  imports: [
    DevicesGroupRoutingModule,
    AlertModule,
    CardModule,
    CommonModule,
    GridModule,
    FormsModule,
    FormModule,
    ButtonModule,
    ButtonGroupModule,
    PTableModule,
    PInputTextModule,
    PTooltipModule,
    CollapseModule,
    ModalModule,
    BadgeModule,
    TooltipModule,
    MatMenuModule,
    ListGroupModule,
    SharedModule
  ],
  declarations: [DevicesGroupComponent],
})
export class DevicesGroupModule {}
