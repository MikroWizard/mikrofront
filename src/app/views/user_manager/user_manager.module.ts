import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import {
  ButtonGroupModule,
  ButtonModule,
  CardModule,
  FormModule,
  GridModule,
  ModalModule,
  ToastModule,
} from "@coreui/angular";
import { MatSelectModule } from "@angular/material/select";
import { NgxMatSelectSearchModule } from "ngx-mat-select-search";

import { UserManagerRoutingModule } from "./user_manager-routing.module";
import { UserManagerComponent } from "./user_manager.component";
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';

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
    TableModule,
    InputTextModule,
    TooltipModule,
    ModalModule,
    FormsModule,
    ToastModule,
  ],
  declarations: [UserManagerComponent],
})
export class UserManagerModule {}
