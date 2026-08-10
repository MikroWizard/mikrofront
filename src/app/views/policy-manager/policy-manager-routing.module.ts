import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PolicyManagerComponent } from './policy-manager.component';

const routes: Routes = [
  {
    path: '',
    component: PolicyManagerComponent,
    data: {
      title: $localize`Terminal Policies`
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PolicyManagerRoutingModule {}