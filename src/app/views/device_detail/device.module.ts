import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";

import {
  ButtonGroupModule,
  ButtonModule,
  CardModule,
  FormModule,
  GridModule,
  ProgressModule,
  NavbarModule,
  AlertModule,
  ModalModule,
  TableModule, 
  UtilitiesModule,
  BadgeModule,
  NavModule, 
  TabsModule,
  SpinnerModule,
} from "@coreui/angular";
import { ChartjsModule } from "@coreui/angular-chartjs";

import { DeviceRoutingModule } from "./device-routing.module";
import { DeviceComponent } from "./device.component";
import { TableModule as PTableModule } from 'primeng/table';
import { InputTextModule as PInputTextModule } from 'primeng/inputtext';
import { TooltipModule as PTooltipModule } from 'primeng/tooltip';

import { WidgetsModule } from "../widgets/widgets.module";
import { DeviceInfoModule } from "./device-info/device-info.module";
import { DhcpInfoModule } from "./dhcp-info/dhcp-info.module";
import { DevLogsModule } from "../device_logs/devlogs.module";
import { PingStatsModule } from "./ping-status/ping-status.module";
import { ActiveUsersModule } from "./active-users/active-users.module";
import { AuthModule } from "../auth_log/auth.module";
import { AccModule } from "../acc_log/acc.module";
import { FormsModule } from "@angular/forms";
import { SpeedTestModule } from "./speed-test/speed-test.module";
import { AIChatLogsModule } from "./ai-chat-logs/ai-chat-logs.module";
import { CustomerRouterToolsModule } from "../customer-router-tools/customer-router-tools.module";
import { ConfigVersionsModule } from "./config-versions/config-versions.module";
import { SessionManagerModule } from "../session-manager/session-manager.module";

import { SharedModule } from "../../shared/shared.module";

@NgModule({
  imports: [
    FormsModule,
    DeviceRoutingModule,
    CardModule,
    AlertModule,
    CommonModule,
    GridModule,
    ProgressModule,
    FormModule,
    ButtonModule,
    ButtonGroupModule,
    ChartjsModule,
    WidgetsModule,
    DeviceInfoModule,
    DhcpInfoModule,
    DevLogsModule,
    PingStatsModule,
    ActiveUsersModule,
    AuthModule,
    AccModule,
    SpinnerModule,
    PTableModule,
    PInputTextModule,
    PTooltipModule,
    NavbarModule,
    ModalModule,
    TableModule, 
    UtilitiesModule,
    BadgeModule,
    NavModule, 
    TabsModule,
    SpeedTestModule,
    AIChatLogsModule,
    CustomerRouterToolsModule,
    ConfigVersionsModule,
    SessionManagerModule,
    SharedModule
  ],
  declarations: [DeviceComponent],
})
export class DeviceModule {}
