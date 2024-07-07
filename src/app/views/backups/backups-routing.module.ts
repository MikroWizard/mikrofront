import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { BackupsComponent } from './backups.component';

const routes: Routes = [
  {
    path: '',
    component: BackupsComponent,
    data: {
      title: $localize`Backups` 
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BackupsRoutingModule {
}
