import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import {
  ButtonGroupModule,
  ButtonModule,
  CardModule,
  FormModule,
  GridModule,
  NavModule,
  TabsModule,
  ModalModule,
  BadgeModule,
  ToastModule,
} from "@coreui/angular";
import { IconModule } from "@coreui/icons-angular";

import { PermissionsRoutingModule } from "./permissions-routing.module";
import { PermissionsComponent } from "./permissions.component";
import { GuiGridModule } from "@generic-ui/ngx-grid";

@NgModule({
  imports: [
    PermissionsRoutingModule,
    CardModule,
    NavModule,
    IconModule,
    TabsModule,
    CommonModule,
    GridModule,
    ToastModule,
    FormModule,
    ButtonModule,
    ButtonGroupModule,
    GuiGridModule,
    ModalModule,
    FormsModule,
    BadgeModule,
  ],
  declarations: [PermissionsComponent],
})
export class PermissionsModule {}
