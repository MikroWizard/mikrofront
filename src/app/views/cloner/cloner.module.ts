import { NgModule } from "@angular/core";
import { CommonModule, TitleCasePipe } from "@angular/common";
import { FormsModule,ReactiveFormsModule } from "@angular/forms";

import {
  ButtonModule,
  CardModule,
  FormModule,
  GridModule,
  ModalModule,
  ButtonGroupModule,
  ToastModule,
  TooltipModule,
  NavModule, 
  TabsModule,
  BadgeModule,
  AlertModule,
} from "@coreui/angular";
import { ClonerRoutingModule } from "./cloner-routing.module";
import { ClonerComponent } from "./cloner.component";
import { TableModule as PTableModule } from 'primeng/table';
import { InputTextModule as PInputTextModule } from 'primeng/inputtext';
import { TooltipModule as PTooltipModule } from 'primeng/tooltip';

import { NgxSuperSelectModule} from "ngx-super-select";

@NgModule({
  imports: [
    ClonerRoutingModule,
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
    ReactiveFormsModule,
    FormsModule,
    NgxSuperSelectModule,
    ToastModule,
    TooltipModule,
    NavModule, 
    TabsModule,
    BadgeModule,
    AlertModule,
  ],
  declarations: [ClonerComponent],
  providers: [TitleCasePipe],
})
export class ClonerModule {}
