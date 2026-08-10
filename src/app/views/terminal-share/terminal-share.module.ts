import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { TerminalShareComponent } from './terminal-share.component';

const routes: Routes = [
  {
    path: '',
    component: TerminalShareComponent,
    data: { title: 'Shared Terminal Session' }
  }
];

@NgModule({
  declarations: [
    TerminalShareComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class TerminalShareModule { }
