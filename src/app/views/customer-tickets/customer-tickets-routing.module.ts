import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CustomerTicketsComponent } from './customer-tickets.component';

const routes: Routes = [
  {
    path: '',
    component: CustomerTicketsComponent,
    data: {
      title: 'Support Tickets'
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CustomerTicketsRoutingModule { }
