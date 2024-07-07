import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { UserManagerComponent } from './user_manager.component';

const routes: Routes = [
  {
    path: '',
    component: UserManagerComponent,
    data: {
      title: $localize`User Managment` 
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UserManagerRoutingModule {
}
