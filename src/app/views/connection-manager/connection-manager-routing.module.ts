import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ConnectionManagerComponent } from './connection-manager.component';

const routes: Routes = [
  {
    path: '',
    component: ConnectionManagerComponent,
  },
  {
    path: ':id',
    component: ConnectionManagerComponent,
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ConnectionManagerRoutingModule {}
