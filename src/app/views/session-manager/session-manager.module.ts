import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgxSuperSelectModule } from "ngx-super-select";

import {
  BadgeModule,
  ButtonModule,
  CardModule,
  FormModule,
  GridModule,
  ModalModule,
  ButtonGroupModule,
  TabsModule,
  ToastModule,
  CollapseModule,
  TooltipModule,
  ListGroupModule,
  OffcanvasModule,
  NavModule,
} from '@coreui/angular';
import { SessionManagerRoutingModule } from './session-manager-routing.module';
import { ActiveSessionsComponent } from './active-sessions.component';
import { SessionHistoryComponent } from './session-history.component';
import { CommandHistoryComponent } from './command-history.component';
import { TableModule as PTableModule } from 'primeng/table';
import { InputTextModule as PInputTextModule } from 'primeng/inputtext';
import { TooltipModule as PTooltipModule } from 'primeng/tooltip';

import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { SharedModule } from '../../shared/shared.module';

import { SessionsListComponent } from './components/sessions-list/sessions-list.component';
import { RecordingsListComponent } from './components/recordings-list/recordings-list.component';
import { CommandLogsListComponent } from './components/command-logs-list/command-logs-list.component';

@NgModule({
  imports: [
    SessionManagerRoutingModule,
    BadgeModule,
    CardModule,
    CommonModule,
    GridModule,
    FormModule,
    ButtonModule,
    ButtonGroupModule,
    PTableModule,
    PInputTextModule,
    PTooltipModule,
    AutoCompleteModule,
    NgxSuperSelectModule,
    ModalModule,
    ReactiveFormsModule,
    FormsModule,
    TabsModule,
    ToastModule,
    ListGroupModule,
    MatInputModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatAutocompleteModule,
    MatIconModule,
    MatMenuModule,
    CollapseModule,
    TooltipModule,
    OffcanvasModule,
    NavModule,
    SharedModule
  ],
  declarations: [
    ActiveSessionsComponent,
    SessionHistoryComponent,
    CommandHistoryComponent,
    SessionsListComponent,
    RecordingsListComponent,
    CommandLogsListComponent
  ],
  exports: [
    SessionsListComponent,
    RecordingsListComponent,
    CommandLogsListComponent
  ]
})
export class SessionManagerModule {}