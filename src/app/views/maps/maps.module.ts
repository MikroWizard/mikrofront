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
  ModalModule,
  TableModule, 
  UtilitiesModule
} from "@coreui/angular";
import { IconModule } from "@coreui/icons-angular";

import { ChartjsModule } from "@coreui/angular-chartjs";
import { NgScrollbarModule } from 'ngx-scrollbar';
import { MapsRoutingModule } from "./maps-routing.module";
import { MapsComponent } from "./maps.component";
import { ClipboardModule } from "@angular/cdk/clipboard";
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { SharedModule } from "../../shared/shared.module";

@NgModule({
  imports: [
    MapsRoutingModule,
    CardModule,
    WidgetModule,
    CommonModule,
    GridModule,
    ProgressModule,
    ReactiveFormsModule,
    ButtonModule,
    ModalModule,
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
    InfiniteScrollModule,
    IconModule,
    SharedModule
  ],
  declarations: [MapsComponent],
})
export class MapsModule {}
