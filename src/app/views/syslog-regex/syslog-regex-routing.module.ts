import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SyslogRegexComponent } from './syslog-regex.component';

const routes: Routes = [
    {
        path: '',
        component: SyslogRegexComponent,
        data: {
            title: 'Syslog Custom Regex'
        }
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class SyslogRegexRoutingModule {
}
