import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

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
} from '@coreui/angular';
import { ChartjsModule } from '@coreui/angular-chartjs';

import { WidgetsModule } from "../../widgets/widgets.module";

// import { WidgetsRoutingModule } from './widgets-routing.module';
import { DhcpInfoComponent } from './dhcp-info.component';
import { TableModule as PTableModule } from 'primeng/table';
import { InputTextModule as PInputTextModule } from 'primeng/inputtext';
import { TooltipModule as PTooltipModule } from 'primeng/tooltip';

@NgModule({
  declarations: [
    DhcpInfoComponent,
  ],
  imports: [  
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
      NavbarModule,
      ModalModule,
      PTableModule,
      PInputTextModule,
      PTooltipModule,
      TableModule, 
      UtilitiesModule,
      BadgeModule,
      NavModule, 
      TabsModule,
  ],
  exports: [
    DhcpInfoComponent,
  ]
})
export class DhcpInfoModule {
}
