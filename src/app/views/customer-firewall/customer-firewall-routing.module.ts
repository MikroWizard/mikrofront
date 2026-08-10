import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CustomerFirewallComponent } from './customer-firewall.component';

const routes: Routes = [
  {
    path: '',
    component: CustomerFirewallComponent,
    data: {
      title: 'Simple Firewall'
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CustomerFirewallRoutingModule {}
