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
import { SequencesRoutingModule } from "./sequences-routing.module";
import { SequencesComponent } from "./sequences.component";
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { NgxSuperSelectModule } from "ngx-super-select";
import { SharedModule } from "../../shared/shared.module";

@NgModule({
    imports: [
        SequencesRoutingModule,
        CardModule,
        CommonModule,
        GridModule,
        FormModule,
        ButtonModule,
        ButtonGroupModule,
        TableModule,
        InputTextModule,
        TooltipModule,
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
        CollapseModule,
        SharedModule
    ],
    declarations: [SequencesComponent],
})
export class SequencesModule { }
