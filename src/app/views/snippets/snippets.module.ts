import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import {
  ButtonGroupModule,
  ButtonModule,
  CardModule,
  FormModule,
  GridModule,
  ToastModule,
  ModalModule,
} from "@coreui/angular";
import { SnippetsRoutingModule } from "./snippets-routing.module";
import { SnippetsComponent } from "./snippets.component";
import { GuiGridModule } from "@generic-ui/ngx-grid";

@NgModule({
  imports: [
    SnippetsRoutingModule,
    CardModule,
    CommonModule,
    GridModule,
    FormModule,
    ButtonModule,
    ButtonGroupModule,
    GuiGridModule,
    ModalModule,
    ToastModule,
    FormsModule,
  ],
  declarations: [SnippetsComponent],
})
export class SnippetsModule {}
