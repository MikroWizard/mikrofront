import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DevicesComponent } from './devices.component';

const routes: Routes = [
  {
    path: '',
    component: DevicesComponent,
    data: {
      title: $localize`Device List` 
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DevicesRoutingModule {
}
