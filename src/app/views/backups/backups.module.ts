import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Highlight, HighlightAuto } from "ngx-highlightjs";
import { HighlightLineNumbers } from "ngx-highlightjs/line-numbers";

import {
  ButtonModule,
  CardModule,
  GridModule,
  CollapseModule,
  BadgeModule,
  ModalModule,
} from "@coreui/angular";
import { BackupsRoutingModule } from "./backups-routing.module";
import { BackupsComponent } from "./backups.component";
import { GuiGridModule } from "@generic-ui/ngx-grid";

@NgModule({
  imports: [
    BackupsRoutingModule,
    CardModule,
    CommonModule,
    GridModule,
    ButtonModule,
    ButtonModule,
    GuiGridModule,
    CollapseModule,
    BadgeModule,
    Highlight,
    HighlightAuto,
    HighlightLineNumbers,
    ModalModule,
  ],
  declarations: [BackupsComponent],
})
export class BackupsModule {}
