import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { SharedModule } from '../shared/shared.module';

import { TerminalRoutingModule } from './terminal-routing.module';
import { TerminalComponent } from './terminal.component';
import { TerminalSettingsComponent } from './terminal-settings/terminal-settings.component';

@NgModule({
  declarations: [
    TerminalComponent,
    TerminalSettingsComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    SharedModule,
    TerminalRoutingModule,
  ],
  exports: [
    TerminalSettingsComponent,
  ],
})
export class TerminalModule {}
