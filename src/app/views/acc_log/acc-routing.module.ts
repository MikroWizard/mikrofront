import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";

import { AccComponent } from "./acc.component";

const routes: Routes = [
  {
    path: "",
    component: AccComponent,
    data: {
      title: $localize`Accounting Logs`,
    },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AccRoutingModule {}
