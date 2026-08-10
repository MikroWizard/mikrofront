import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  ButtonGroupModule,
  ButtonModule,
  CardModule,
  FormModule,
  GridModule,
  ModalModule,
  TableModule,
  UtilitiesModule,
  BadgeModule,
  SpinnerModule,
} from '@coreui/angular';
import { TooltipModule as PTooltipModule } from 'primeng/tooltip';
import { UnifiedDiffComponent, SideBySideDiffComponent } from 'ngx-diff';

import { ConfigVersionsComponent } from './config-versions.component';

@NgModule({
  declarations: [
    ConfigVersionsComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    CardModule,
    GridModule,
    FormModule,
    ButtonModule,
    ButtonGroupModule,
    ModalModule,
    TableModule,
    UtilitiesModule,
    BadgeModule,
    SpinnerModule,
    PTooltipModule,
    UnifiedDiffComponent,
    SideBySideDiffComponent,
  ],
  exports: [
    ConfigVersionsComponent,
  ],
})
export class ConfigVersionsModule {}
