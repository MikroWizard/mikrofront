import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";

import {
  ButtonModule,
  CardModule,
  GridModule,
  CollapseModule,
  DropdownModule,
} from "@coreui/angular";
import { NgxMatSelectSearchModule } from "ngx-mat-select-search";
import { SyslogRoutingModule } from "./syslog-routing.module";
import { SyslogComponent } from "./syslog.component";
import { GuiGridModule } from "@generic-ui/ngx-grid";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { FormsModule } from "@angular/forms";

import { MatSelectModule } from "@angular/material/select";

@NgModule({
  imports: [
    SyslogRoutingModule,
    CardModule,
    CommonModule,
    GridModule,
    FormsModule,
    ButtonModule,
    GuiGridModule,
    CollapseModule,
    DropdownModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    NgxMatSelectSearchModule,
    MatDatepickerModule,
  ],
  declarations: [SyslogComponent],
})
export class SyslogModule {}
