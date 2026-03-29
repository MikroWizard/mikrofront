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
  BadgeModule,
  TooltipModule,
} from "@coreui/angular";
import { SettingsRoutingModule } from "./settings-routing.module";
import { SettingsComponent } from "./settings.component";
import { TableModule as PTableModule } from 'primeng/table';
import { InputTextModule as PInputTextModule } from 'primeng/inputtext';
import { TooltipModule as PTooltipModule } from 'primeng/tooltip';

import { FormsModule } from "@angular/forms";

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
    PTableModule,
    PInputTextModule,
    PTooltipModule,
    SpinnerModule,
    ToastModule,
    ModalModule,
    BadgeModule,
    TooltipModule,
  ],
  declarations: [SettingsComponent],
})
export class SettingsModule {}
