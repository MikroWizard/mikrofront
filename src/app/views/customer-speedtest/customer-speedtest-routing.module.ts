import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CustomerSpeedTestComponent } from './customer-speedtest.component';

const routes: Routes = [
  {
    path: '',
    component: CustomerSpeedTestComponent,
    data: {
      title: 'Speed Test'
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CustomerSpeedTestRoutingModule { }
