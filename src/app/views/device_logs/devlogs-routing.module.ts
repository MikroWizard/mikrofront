import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DevLogsComponent } from './devlogs.component';

const routes: Routes = [
  {
    path: '',
    component: DevLogsComponent,
    data: {
      title: $localize`Device Logs` 
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DevLogsRoutingModule {
}
