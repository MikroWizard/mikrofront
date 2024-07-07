import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";

import {
  ButtonGroupModule,
  ButtonModule,
  CardModule,
  FormModule,
  GridModule,
  SpinnerModule,
  ToastModule,
  ModalModule,
} from "@coreui/angular";
import { SettingsRoutingModule } from "./settings-routing.module";
import { SettingsComponent } from "./settings.component";
import { GuiGridModule } from "@generic-ui/ngx-grid";

import { FormsModule } from "@angular/forms";
import { MatSelectModule } from "@angular/material/select";
import { NgxMatSelectSearchModule } from "ngx-mat-select-search";

@NgModule({
  imports: [
    SettingsRoutingModule,
    CardModule,
    CommonModule,
    GridModule,
    FormsModule,
    FormModule,
    ButtonModule,
    ButtonGroupModule,
    GuiGridModule,
    MatSelectModule,
    NgxMatSelectSearchModule,
    SpinnerModule,
    ToastModule,
    ModalModule,
  ],
  declarations: [SettingsComponent],
})
export class SettingsModule {}
