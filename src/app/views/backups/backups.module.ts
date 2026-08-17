import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Highlight, HighlightAuto } from "ngx-highlightjs";
import { HighlightLineNumbers } from "ngx-highlightjs/line-numbers";
import { HighlightJsModule } from 'ngx-highlight-js';
import {
  ButtonModule,
  ButtonGroupModule,
  CardModule,
  GridModule,
  CollapseModule,
  BadgeModule,
  ModalModule,
  FormModule,
  ToastModule,
  AlertModule,
} from "@coreui/angular";

import { BackupsRoutingModule } from "./backups-routing.module";
import { BackupsComponent } from "./backups.component";
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatSelectModule } from "@angular/material/select";
import { FormsModule } from "@angular/forms";
import { UnifiedDiffComponent,SideBySideDiffComponent } from 'ngx-diff';
import { ClipboardModule } from "@angular/cdk/clipboard";

import { SharedModule } from "../../shared/shared.module";

@NgModule({
  imports: [
    BackupsRoutingModule,
    CardModule,
    CommonModule,
    GridModule,
    FormModule,
    FormsModule,
    ButtonModule,
    ButtonGroupModule,
    TableModule,
    InputTextModule,
    TooltipModule,
    CollapseModule,
    BadgeModule,
    AlertModule,
    Highlight,
    HighlightAuto,
    HighlightLineNumbers,
    ModalModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatSelectModule,
    UnifiedDiffComponent,
    SideBySideDiffComponent,
    ToastModule,
    HighlightJsModule,
    ClipboardModule,
    SharedModule
  ],
  declarations: [BackupsComponent],
})
export class BackupsModule {}
