import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";

import {
  ButtonModule,
  CardModule,
  GridModule,
  CollapseModule,
  DropdownModule,
  AlertModule,
} from "@coreui/angular";
import { NgxMatSelectSearchModule } from "ngx-mat-select-search";
import { SyslogRoutingModule } from "./syslog-routing.module";
import { SyslogComponent } from "./syslog.component";
import { TableModule } from 'primeng/table';
import { DrawerModule } from 'primeng/drawer';
import { InputTextModule } from 'primeng/inputtext';
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { FormsModule } from "@angular/forms";

import { MatSelectModule } from "@angular/material/select";

import { SharedModule } from "../../shared/shared.module";

@NgModule({
  imports: [
    SyslogRoutingModule,
    CardModule,
    CommonModule,
    GridModule,
    FormsModule,
    ButtonModule,
    TableModule,
    DrawerModule,
    InputTextModule,
    CollapseModule,
    DropdownModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    NgxMatSelectSearchModule,
    MatDatepickerModule,
    AlertModule,
    SharedModule
  ],
  declarations: [SyslogComponent],
})
export class SyslogModule {}
