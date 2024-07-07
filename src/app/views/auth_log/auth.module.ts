import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  ButtonModule,
  CardModule,
  GridModule,
  CollapseModule,
  BadgeModule,
} from '@coreui/angular';
import { AuthRoutingModule } from './auth-routing.module';
import { AuthComponent } from './auth.component';
import { GuiGridModule } from '@generic-ui/ngx-grid';

import { faCoffee } from '@fortawesome/free-solid-svg-icons';
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
    GuiGridModule,
    CollapseModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatSelectModule,
    BadgeModule
  ],
  declarations: [AuthComponent]
})
export class AuthModule {
}
