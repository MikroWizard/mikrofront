import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ActiveSessionsComponent } from './active-sessions.component';
import { SessionHistoryComponent } from './session-history.component';
import { CommandHistoryComponent } from './command-history.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'active',
    pathMatch: 'full'
  },
  {
    path: 'active',
    component: ActiveSessionsComponent,
    data: {
      title: $localize`Active Sessions`
    }
  },
  {
    path: 'history',
    component: SessionHistoryComponent,
    data: {
      title: $localize`Session History`
    }
  },
  {
    path: 'commands',
    component: CommandHistoryComponent,
    data: {
      title: $localize`Command History`
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SessionManagerRoutingModule {}