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
} from "@coreui/angular";
import { UserTasksRoutingModule } from "./user_tasks-routing.module";
import { UserTasksComponent } from "./user_tasks.component";
import { GuiGridModule } from "@generic-ui/ngx-grid";

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
    GuiGridModule,
    ModalModule,
    ReactiveFormsModule,
    FormsModule,
    NgxSuperSelectModule,
  ],
  declarations: [UserTasksComponent],
})
export class UserTasksModule {}
