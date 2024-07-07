import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DevicesGroupComponent } from './devgroup.component';

const routes: Routes = [
  {
    path: '',
    component: DevicesGroupComponent,
    data: {
      title: $localize`Device Group` 
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DevicesGroupRoutingModule {
}