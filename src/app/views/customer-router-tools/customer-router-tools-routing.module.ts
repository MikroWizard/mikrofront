import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { CustomerRouterToolsComponent } from './customer-router-tools.component';

const routes: Routes = [
  {
    path: '',
    component: CustomerRouterToolsComponent,
    data: {
      title: 'Router Tools & Connected Clients'
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CustomerRouterToolsRoutingModule {
}
