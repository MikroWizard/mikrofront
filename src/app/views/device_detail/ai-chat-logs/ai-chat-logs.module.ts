import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ButtonModule,
  CardModule,
  ModalModule,
  SpinnerModule,
} from '@coreui/angular';
import { TableModule as PTableModule } from 'primeng/table';

import { AIChatLogsComponent } from './ai-chat-logs.component';

import { SharedModule } from '../../../shared/shared.module';

@NgModule({
  declarations: [
    AIChatLogsComponent
  ],
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    ModalModule,
    SpinnerModule,
    PTableModule,
    SharedModule
  ],
  exports: [
    AIChatLogsComponent
  ]
})
export class AIChatLogsModule {}
