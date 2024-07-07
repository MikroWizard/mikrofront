import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PermissionsComponent } from './permissions.component';

const routes: Routes = [
  {
    path: '',
    component: PermissionsComponent,
    data: {
      title: $localize`Permissions` 
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PermissionsRoutingModule {
}
