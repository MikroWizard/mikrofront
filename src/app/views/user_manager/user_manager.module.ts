import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import {
  BadgeModule,
  ButtonGroupModule,
  ButtonModule,
  CardModule,
  DropdownModule,
  FormModule,
  GridModule,
  ModalModule,
  ToastModule,
  AlertModule,
  TooltipModule,
} from "@coreui/angular";
import { MatSelectModule } from "@angular/material/select";
import { NgxMatSelectSearchModule } from "ngx-mat-select-search";

import { UserManagerRoutingModule } from "./user_manager-routing.module";
import { UserManagerComponent } from "./user_manager.component";
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule as PTooltipModule } from 'primeng/tooltip';

import { SharedModule } from "../../shared/shared.module";

@NgModule({
  imports: [
    MatSelectModule,
    NgxMatSelectSearchModule,
    UserManagerRoutingModule,
    CardModule,
    CommonModule,
    GridModule,
    FormModule,
    ButtonModule,
    ButtonGroupModule,
    DropdownModule,
    TableModule,
    InputTextModule,
    PTooltipModule,
    TooltipModule,
    ModalModule,
    FormsModule,
    ToastModule,
    AlertModule,
    BadgeModule,
    SharedModule
  ],
  declarations: [UserManagerComponent],
})
export class UserManagerModule {}
