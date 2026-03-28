import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import {
    ButtonGroupModule,
    ButtonModule,
    CardModule,
    FormModule,
    GridModule,
    ToastModule,
    ModalModule,
    BadgeModule,
    AccordionModule,
    NavModule,
    TabsModule,
    AlertModule,
    CollapseModule
} from "@coreui/angular";
import { HighlightJsModule } from 'ngx-highlight-js';
import { SyslogRegexRoutingModule } from "./syslog-regex-routing.module";
import { SyslogRegexComponent } from "./syslog-regex.component";
import { GuiGridModule } from "@generic-ui/ngx-grid";
import { NgxSuperSelectModule } from "ngx-super-select";

@NgModule({
    imports: [
        SyslogRegexRoutingModule,
        CardModule,
        CommonModule,
        GridModule,
        FormModule,
        ButtonModule,
        ButtonGroupModule,
        GuiGridModule,
        ModalModule,
        ToastModule,
        FormsModule,
        BadgeModule,
        NgxSuperSelectModule,
        AccordionModule,
        NavModule,
        TabsModule,
        AlertModule,
        HighlightJsModule,
        CollapseModule
    ],
    declarations: [SyslogRegexComponent],
})
export class SyslogRegexModule { }
