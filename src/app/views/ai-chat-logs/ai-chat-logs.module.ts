import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import {
  CardModule,
  ButtonModule,
  FormModule,
  GridModule,
  ModalModule,
  SpinnerModule,
  DropdownModule,
  ButtonGroupModule,
  BadgeModule
} from '@coreui/angular';
import { TooltipModule } from 'primeng/tooltip';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';

import { AIChatLogsRoutingModule } from './ai-chat-logs-routing.module';
import { AIChatLogsComponent } from './ai-chat-logs.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    FormModule,
    GridModule,
    ModalModule,
    SpinnerModule,
    DropdownModule,
    ButtonGroupModule,
    BadgeModule,
    TooltipModule,
    TableModule,
    InputTextModule,
    AIChatLogsRoutingModule
  ],
  declarations: [AIChatLogsComponent]
})
export class AIChatLogsModule { }

