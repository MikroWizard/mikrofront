import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AIChatLogsComponent } from './ai-chat-logs.component';

const routes: Routes = [
  {
    path: '',
    component: AIChatLogsComponent,
    data: {
      title: 'AI Chat Audit Logs'
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AIChatLogsRoutingModule { }
