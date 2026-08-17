import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule } from "@angular/forms";

import {
  ButtonGroupModule,
  ButtonModule,
  CardModule,
  GridModule,
  WidgetModule,
  ProgressModule,
  TemplateIdDirective,
  BadgeModule,
  ModalModule,
  CarouselModule,
  TooltipModule,
} from "@coreui/angular";

import { ChartjsModule } from "@coreui/angular-chartjs";

import { DashboardRoutingModule } from "./dashboard-routing.module";
import { DashboardComponent } from "./dashboard.component";
import { ClipboardModule } from "@angular/cdk/clipboard";

@NgModule({
  imports: [
    DashboardRoutingModule,
    CardModule,
    WidgetModule,
    CommonModule,
    GridModule,
    ProgressModule,
    ReactiveFormsModule,
    ButtonModule,
    TemplateIdDirective,
    ButtonGroupModule,
    ChartjsModule,
    CarouselModule,
    BadgeModule,
    ClipboardModule,
    ModalModule,
    TooltipModule,
  ],
  declarations: [DashboardComponent],
})
export class DashboardModule {}
