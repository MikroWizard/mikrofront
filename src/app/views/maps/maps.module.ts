import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ButtonModule, ModalModule } from "@coreui/angular";

import { MapsRoutingModule } from "./maps-routing.module";
import { MapsComponent } from "./maps.component";
import { SharedModule } from "../../shared/shared.module";

@NgModule({
  imports: [
    MapsRoutingModule,
    CommonModule,
    FormsModule,
    ButtonModule,
    ModalModule,
    SharedModule,
  ],
  declarations: [MapsComponent],
})
export class MapsModule {}
