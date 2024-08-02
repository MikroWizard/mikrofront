import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule } from "@angular/forms";
import { FormsModule } from "@angular/forms";

import {
  ButtonGroupModule,
  ButtonModule,
  CardModule,
  GridModule,
  WidgetModule,
  ProgressModule,
  TemplateIdDirective,
  TooltipModule,
  BadgeModule,
  CarouselModule,
  ListGroupModule,
  TableModule, 
  UtilitiesModule 
} from "@coreui/angular";

import { ChartjsModule } from "@coreui/angular-chartjs";
import { NgScrollbarModule } from 'ngx-scrollbar';
import { MonitoringRoutingModule } from "./monitoring-routing.module";
import { MonitoringComponent } from "./monitoring.component";
import { ClipboardModule } from "@angular/cdk/clipboard";
import { InfiniteScrollModule } from 'ngx-infinite-scroll';

@NgModule({
  imports: [
    MonitoringRoutingModule,
    CardModule,
    WidgetModule,
    CommonModule,
    GridModule,
    ProgressModule,
    ReactiveFormsModule,
    ButtonModule,
    FormsModule,
    TemplateIdDirective,
    ButtonModule,
    ButtonGroupModule,
    ChartjsModule,
    CarouselModule,
    BadgeModule,
    ClipboardModule,
    ListGroupModule,
    NgScrollbarModule,
    TableModule,
    TooltipModule,
    UtilitiesModule,
    InfiniteScrollModule
  ],
  declarations: [MonitoringComponent],
})
export class MonitoringModule {}
