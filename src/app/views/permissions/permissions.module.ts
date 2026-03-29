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
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';

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
    TableModule,
    InputTextModule,
    TooltipModule,
    ModalModule,
    FormsModule,
    BadgeModule,
  ],
  declarations: [PermissionsComponent],
})
export class PermissionsModule {}
