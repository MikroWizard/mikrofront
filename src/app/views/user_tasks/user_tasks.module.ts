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
  BadgeModule,
  AlertModule,
  ToastModule,
} from "@coreui/angular";
import { UserTasksRoutingModule } from "./user_tasks-routing.module";
import { UserTasksComponent } from "./user_tasks.component";
import { TableModule as PTableModule } from 'primeng/table';
import { InputTextModule as PInputTextModule } from 'primeng/inputtext';
import { TooltipModule as PTooltipModule } from 'primeng/tooltip';

import { NgxSuperSelectModule} from "ngx-super-select";

@NgModule({
  imports: [
    UserTasksRoutingModule,
    CardModule,
    CommonModule,
    GridModule,
    FormModule,
    ButtonModule,
    ButtonGroupModule,
    BadgeModule,
    AlertModule,
    ToastModule,
    PTableModule,
    PInputTextModule,
    PTooltipModule,
    ModalModule,
    ReactiveFormsModule,
    FormsModule,
    NgxSuperSelectModule,
  ],
  declarations: [UserTasksComponent],
})
export class UserTasksModule {}
