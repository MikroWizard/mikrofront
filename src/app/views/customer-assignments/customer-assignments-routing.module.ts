import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CustomerAssignmentsComponent } from './customer-assignments.component';

const routes: Routes = [
  {
    path: '',
    component: CustomerAssignmentsComponent,
    data: {
      title: 'Customer Assignments'
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CustomerAssignmentsRoutingModule { }
