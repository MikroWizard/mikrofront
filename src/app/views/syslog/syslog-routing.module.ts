import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SyslogComponent } from './syslog.component';

const routes: Routes = [
  {
    path: '',
    component: SyslogComponent,
    data: {
      title: $localize`System Logs`
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SyslogRoutingModule {
}
