import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TemplateManagerComponent } from './template-manager.component';

const routes: Routes = [
  {
    path: '',
    component: TemplateManagerComponent,
    data: {
      title: $localize`Connection Templates`
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TemplateManagerRoutingModule {}