import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  ButtonModule,
  CardModule,
  GridModule,
  CollapseModule,
  BadgeModule,
  AlertModule,
} from '@coreui/angular';
import { AuthRoutingModule } from './auth-routing.module';
import { AuthComponent } from './auth.component';
import { TableModule } from 'primeng/table';
import { DrawerModule } from 'primeng/drawer';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';

import { FormsModule } from '@angular/forms'; 

import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatSelectModule} from '@angular/material/select';
@NgModule({
  imports: [
    AuthRoutingModule,
    CardModule,
    CommonModule,
    GridModule,
    FormsModule,
    ButtonModule,
    TableModule,
    DrawerModule,
    InputTextModule,
    TooltipModule,
    CollapseModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatSelectModule,
    BadgeModule,
    AlertModule
  ],
  declarations: [AuthComponent],
  exports: [AuthComponent],
})
export class AuthModule {
}
