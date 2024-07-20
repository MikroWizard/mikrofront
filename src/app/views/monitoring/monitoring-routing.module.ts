import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { MonitoringComponent } from './monitoring.component';

const routes: Routes = [
  {
    path: '',
    component: MonitoringComponent,
    data: {
      title: $localize`Monitoring Wall`
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MonitoringRoutingModule {
}
