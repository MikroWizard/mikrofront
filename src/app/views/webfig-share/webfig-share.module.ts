import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { WebfigShareComponent } from './webfig-share.component';

const routes: Routes = [
  {
    path: '',
    component: WebfigShareComponent,
    data: { title: 'Shared WebFig Session' }
  }
];

@NgModule({
  declarations: [
    WebfigShareComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(routes)
  ]
})
export class WebfigShareModule { }
