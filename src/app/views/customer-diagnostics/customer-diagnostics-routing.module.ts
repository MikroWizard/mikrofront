import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CustomerDiagnosticsComponent } from './customer-diagnostics.component';

const routes: Routes = [
  {
    path: '',
    component: CustomerDiagnosticsComponent,
    data: {
      title: 'Advanced Diagnostics'
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CustomerDiagnosticsRoutingModule { }
