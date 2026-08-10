import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule,ReactiveFormsModule } from "@angular/forms";

import {
  AlertModule,
  ButtonModule,
  CardModule,
  FormModule,
  GridModule,
  ModalModule,
  ButtonGroupModule,
  TabsModule,
  ToastModule,
  CollapseModule,
  TooltipModule,
} from "@coreui/angular";
import { VaultRoutingModule } from "./vault-routing.module";
import { VaultComponent } from "./vault.component";
import { TableModule as PTableModule } from 'primeng/table';
import { InputTextModule as PInputTextModule } from 'primeng/inputtext';
import { TooltipModule as PTooltipModule } from 'primeng/tooltip';

import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { SharedModule } from "../../shared/shared.module";
@NgModule({
  imports: [
    VaultRoutingModule,
    AlertModule,
    CardModule,
    CommonModule,
    GridModule,
    FormModule,
    ButtonModule,
    ButtonGroupModule,
    PTableModule,
    PInputTextModule,
    PTooltipModule,
    ModalModule,
    ReactiveFormsModule,
    FormsModule,
    TabsModule,
    ToastModule,
    MatInputModule,
    MatFormFieldModule,
    CollapseModule,
    TooltipModule,
    SharedModule
  ],
  declarations: [VaultComponent],
})
export class VaultModule {}
