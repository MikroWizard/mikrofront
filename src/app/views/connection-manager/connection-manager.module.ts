import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { SharedModule } from '../../shared/shared.module';

import { ConnectionManagerRoutingModule } from './connection-manager-routing.module';
import { ConnectionManagerComponent } from './connection-manager.component';

import { DeviceTreeComponent } from './device-tree/device-tree.component';
import { TerminalTabComponent } from './terminal-tab/terminal-tab.component';
import { TerminalSettingsComponent } from './terminal-settings/terminal-settings.component';

import { NavModule, TabsModule, ModalModule, ButtonModule, SpinnerModule, FormModule, BadgeModule } from '@coreui/angular';

import { DevLogsModule } from '../device_logs/devlogs.module';
import { AuthModule } from '../auth_log/auth.module';
import { AccModule } from '../acc_log/acc.module';
import { CustomerRouterToolsModule } from '../customer-router-tools/customer-router-tools.module';
import { SpeedTestModule } from '../device_detail/speed-test/speed-test.module';
import { ConfigVersionsModule } from '../device_detail/config-versions/config-versions.module';

import { DragDropModule } from '@angular/cdk/drag-drop';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { TooltipModule as pTooltipModule } from 'primeng/tooltip';
import { NgxSuperSelectModule } from "ngx-super-select";
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@NgModule({
  declarations: [
    ConnectionManagerComponent,
    DeviceTreeComponent,
    TerminalTabComponent,
    TerminalSettingsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    SharedModule,
    NavModule,
    TabsModule,
    ModalModule,
    ButtonModule,
    SpinnerModule,
    FormModule,
    DragDropModule,
    ConnectionManagerRoutingModule,
    DevLogsModule,
    AuthModule,
    AccModule,
    CustomerRouterToolsModule,
    SpeedTestModule,
    ConfigVersionsModule,
    BadgeModule,
    AutoCompleteModule,
    NgxSuperSelectModule,
    MatAutocompleteModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    pTooltipModule
  ],
})
export class ConnectionManagerModule {}
