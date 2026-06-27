import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminTicketsComponent } from './admin-tickets.component';

const routes: Routes = [
  {
    path: '',
    component: AdminTicketsComponent,
    data: {
      title: 'Customer Tickets'
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminTicketsRoutingModule { }
