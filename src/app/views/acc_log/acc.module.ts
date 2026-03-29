import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";

import {
  ButtonModule,
  CardModule,
  FormModule,
  GridModule,
  CollapseModule,
  BadgeModule,
  AlertModule
} from "@coreui/angular";

import { AccRoutingModule } from "./acc-routing.module";
import { AccComponent } from "./acc.component";
import { TableModule } from 'primeng/table';
import { DrawerModule } from 'primeng/drawer';
import { InputTextModule } from 'primeng/inputtext';

import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatSelectModule } from "@angular/material/select";

import { FormsModule } from "@angular/forms";

@NgModule({
  imports: [
    AccRoutingModule,
    CardModule,
    CommonModule,
    GridModule,
    FormsModule,
    ButtonModule,
    FormModule,
    ButtonModule,
    TableModule,
    DrawerModule,
    InputTextModule,
    CollapseModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatSelectModule,
    BadgeModule,
    AlertModule
  ],
  declarations: [AccComponent],
  exports: [AccComponent],
})
export class AccModule {}
