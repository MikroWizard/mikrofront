import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ChartjsModule } from '@coreui/angular-chartjs';
import { HighlightJsModule } from 'ngx-highlight-js';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { SharedModule as AppSharedModule } from "../../shared/shared.module";

import {
    AvatarModule,
    ButtonGroupModule,
    ButtonModule,
    CardModule,
    FormModule,
    GridModule as CoreUIGridModule,
    NavModule,
    ProgressModule,
    TableModule,
    TabsModule,
    ModalModule,
    DropdownModule,
    SharedModule,
    ListGroupModule,
    BadgeModule,
    TooltipModule,
    ToastModule
} from '@coreui/angular';
import { MatMenuModule } from '@angular/material/menu';

import { loginChecker } from '../../providers/login_checker';
import { VpnService, VpnStatusResponse, VpnPeer, VpnServerConfig } from '../../providers/mikrowizard/vpn.service';
import { IconModule } from '@coreui/icons-angular';

import { VpnRoutingModule } from './vpn-routing.module';
import { VpnComponent } from './vpn.component';
import { TableModule as PTableModule } from 'primeng/table';
import { TooltipModule as PTooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';

@NgModule({
    imports: [
        VpnRoutingModule,
        CardModule,
        NavModule,
        IconModule,
        TabsModule,
        CommonModule,
        PTableModule,
        PTooltipModule,
        InputTextModule,
        ProgressModule,
        ReactiveFormsModule,
        ButtonModule,
        FormModule,
        ButtonModule,
        ButtonGroupModule,
        ChartjsModule,
        AvatarModule,
        TableModule,
        ModalModule,
        DropdownModule,
        SharedModule,
        ListGroupModule,
        BadgeModule,
        TooltipModule,
        FormsModule,
        ToastModule,
        CoreUIGridModule,
        MatMenuModule,
        HighlightJsModule,
        ClipboardModule,
        AppSharedModule
    ],
    declarations: [VpnComponent]
})
export class VpnModule {
}
