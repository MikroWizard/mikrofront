import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CustomerPortForwardComponent } from './customer-portforward.component';

const routes: Routes = [
  {
    path: '',
    component: CustomerPortForwardComponent,
    data: {
      title: 'Port Forwarding'
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CustomerPortForwardRoutingModule { }
