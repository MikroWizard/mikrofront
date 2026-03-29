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
  AlertModule,
} from "@coreui/angular";
import { NgxMatSelectSearchModule } from "ngx-mat-select-search";
import { DevLogsRoutingModule } from "./devlogs-routing.module";
import { DevLogsComponent } from "./devlogs.component";
import { TableModule } from 'primeng/table';
import { DrawerModule } from 'primeng/drawer';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
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
    TableModule,
    DrawerModule,
    InputTextModule,
    TooltipModule,
    CollapseModule,
    BadgeModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    NgxMatSelectSearchModule,
    MatDatepickerModule,
    AlertModule,
  ],
  declarations: [DevLogsComponent],
  exports: [DevLogsComponent],
})
export class DevLogsModule {}
