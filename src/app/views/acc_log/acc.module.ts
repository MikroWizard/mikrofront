import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";

import {
  ButtonModule,
  CardModule,
  FormModule,
  GridModule,
  CollapseModule,
} from "@coreui/angular";

import { AccRoutingModule } from "./acc-routing.module";
import { AccComponent } from "./acc.component";
import { GuiGridModule } from "@generic-ui/ngx-grid";

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
    GuiGridModule,
    CollapseModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatSelectModule,
  ],
  declarations: [AccComponent],
})
export class AccModule {}
