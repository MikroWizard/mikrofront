import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TerminalComponent } from './terminal.component';
import { TerminalSettingsComponent } from './terminal-settings/terminal-settings.component';
// other components will be imported here when implemented

const routes: Routes = [
  {
    path: 'connect/:deviceId',
    component: TerminalComponent,
    data: { title: 'Terminal', breadcrumb: 'Terminal' },
  },
  {
    path: 'connect/:deviceId/:brand',
    component: TerminalComponent,
    data: { title: 'Terminal', breadcrumb: 'Terminal' },
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TerminalRoutingModule {}
