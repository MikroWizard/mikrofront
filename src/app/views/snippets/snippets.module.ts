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
  BadgeModule,
} from "@coreui/angular";
import { SnippetsRoutingModule } from "./snippets-routing.module";
import { SnippetsComponent } from "./snippets.component";
import { TableModule as PTableModule } from 'primeng/table';
import { InputTextModule as PInputTextModule } from 'primeng/inputtext';
import { TooltipModule as PTooltipModule } from 'primeng/tooltip';

import { SharedModule } from "../../shared/shared.module";

@NgModule({
  imports: [
    SnippetsRoutingModule,
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
    ToastModule,
    BadgeModule,
    FormsModule,
    SharedModule
  ],
  declarations: [SnippetsComponent],
})
export class SnippetsModule {}
