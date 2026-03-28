import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { VpnComponent } from './vpn.component';

const routes: Routes = [
    {
        path: '',
        component: VpnComponent,
        data: {
            title: 'VPN Server'
        }
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class VpnRoutingModule {
}
