import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { UserTasksComponent } from './user_tasks.component';

const routes: Routes = [
  {
    path: '',
    component: UserTasksComponent,
    data: {
      title: $localize`System Tasks` 
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UserTasksRoutingModule {
}
