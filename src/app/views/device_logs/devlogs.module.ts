import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule } from "@angular/forms";

import {
  ButtonGroupModule,
  ButtonModule,
  CardModule,
  FormModule,
  GridModule,
  CollapseModule,
  BadgeModule,
} from "@coreui/angular";
import { NgxMatSelectSearchModule } from "ngx-mat-select-search";
import { DevLogsRoutingModule } from "./devlogs-routing.module";
import { DevLogsComponent } from "./devlogs.component";
import { GuiGridModule } from "@generic-ui/ngx-grid";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { FormsModule } from "@angular/forms";

import { MatSelectModule } from "@angular/material/select";

@NgModule({
  imports: [
    DevLogsRoutingModule,
    CardModule,
    CommonModule,
    GridModule,
    ReactiveFormsModule,
    FormsModule,
    FormModule,
    ButtonModule,
    ButtonGroupModule,
    GuiGridModule,
    CollapseModule,
    BadgeModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    NgxMatSelectSearchModule,
    MatDatepickerModule,
  ],
  declarations: [DevLogsComponent],
})
export class DevLogsModule {}
