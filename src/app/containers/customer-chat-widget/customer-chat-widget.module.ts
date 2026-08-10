import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule, FormModule, SpinnerModule } from '@coreui/angular';
import { CustomerChatWidgetComponent } from './customer-chat-widget.component';

@NgModule({
  declarations: [CustomerChatWidgetComponent],
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    FormModule,
    SpinnerModule
  ],
  exports: [CustomerChatWidgetComponent]
})
export class CustomerChatWidgetModule { }
