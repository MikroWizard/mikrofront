import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule,ReactiveFormsModule } from "@angular/forms";

import {
  ButtonModule,
  CardModule,
  FormModule,
  GridModule,
  ModalModule,
  ButtonGroupModule,
  TabsModule,
  ToastModule,
  CollapseModule,
} from "@coreui/angular";
import { VaultRoutingModule } from "./vault-routing.module";
import { VaultComponent } from "./vault.component";
import { GuiGridModule } from "@generic-ui/ngx-grid";

import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
@NgModule({
  imports: [
    VaultRoutingModule,
    CardModule,
    CommonModule,
    GridModule,
    FormModule,
    ButtonModule,
    ButtonGroupModule,
    GuiGridModule,
    ModalModule,
    ReactiveFormsModule,
    FormsModule,
    TabsModule,
    ToastModule,
    MatInputModule,
    MatFormFieldModule,
    CollapseModule
  ],
  declarations: [VaultComponent],
})
export class VaultModule {}
