import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CustomerPortalComponent } from './customer-portal.component';

const routes: Routes = [
  {
    path: '',
    component: CustomerPortalComponent,
    data: {
      title: 'Customer Portal'
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CustomerPortalRoutingModule { }
