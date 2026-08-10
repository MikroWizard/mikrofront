import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ExecutionsComponent } from './executions.component';

const routes: Routes = [
  {
    path: '',
    component: ExecutionsComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ExecutionsRoutingModule {}
