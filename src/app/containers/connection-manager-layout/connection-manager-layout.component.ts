import { Component, OnInit, OnDestroy, EventEmitter, Output } from '@angular/core';
import { Router } from '@angular/router';
import { dataProvider } from '../../providers/mikrowizard/data';
import { User } from '../../providers/mikrowizard/user';
import { LicenseService } from '../../providers/license.service';

@Component({
  selector: 'app-connection-manager-layout',
  templateUrl: './connection-manager-layout.component.html',
  styleUrls: ['./connection-manager-layout.component.scss'],
  host: {
    '[class.topbar-auto-hide]': 'topbarAutoHide'
  }
})
export class ConnectionManagerLayoutComponent implements OnInit, OnDestroy {
  @Output() UserModalEvent = new EventEmitter<any>();
  @Output() ConfirmModalEvent = new EventEmitter<any>();

  public current_user: User;
  public uid: number;
  public uname: string;
  public fname: string;
  public lname: string;
  public tasks: any = [];
  public timer: any;
  public topbarAutoHide = false;
  public topbarHint = false;
  private topbarHintTimer: any;

  constructor(
    private router: Router,
    private data_provider: dataProvider,
    private licenseService: LicenseService
  ) {
    const session_info: string = localStorage.getItem('current_user') || "[]";
    this.current_user = JSON.parse(session_info);
    try {
      this.topbarAutoHide = localStorage.getItem('mikrowizard_cm_topbar_autohide') === '1';
    } catch (e) {}
  }

  toggleTopbarAutoHide() {
    this.topbarAutoHide = !this.topbarAutoHide;
    try {
      localStorage.setItem('mikrowizard_cm_topbar_autohide', this.topbarAutoHide ? '1' : '0');
    } catch (e) {}
    if (this.topbarAutoHide) {
      this.topbarHint = true;
      if (this.topbarHintTimer) clearTimeout(this.topbarHintTimer);
      this.topbarHintTimer = setTimeout(() => { this.topbarHint = false; }, 3000);
    } else {
      this.topbarHint = false;
    }
  }

  ngOnInit(): void {
    if (this.current_user) {
      this.uid = this.current_user.partner_id;
      this.uname = this.current_user.name;
      this.fname = this.current_user.firstname;
      this.lname = this.current_user.lastname;
    }
    
    if (this.current_user && this.current_user.role === 'customer') {
      return;
    }
    this.data_provider.getSessionInfo().then((res: any) => {
      this.licenseService.setLicenseState(res['license']);
    }).catch(() => {});
    this.get_running_tasks();
    this.timer = setInterval(() => {
      this.get_running_tasks();
    }, 5000);
  }

  get_running_tasks() {
    if (this.current_user && this.current_user.role === 'customer') {
      return;
    }
    this.data_provider.get_running_tasks().then((res: any) => {
      if (res && res['tasks']) {
        this.tasks = res['tasks'].filter((x:any) => x.status);
      }
    });
  }

  callParent(action: string): void {
    this.UserModalEvent.next(action);
  }

  callParentConfirm(action: string, data: any): void {
    this.ConfirmModalEvent.next({action: action, data: data});
  }

  logout() {
    this.data_provider.logout().then(res => {
      this.router.navigate(['login']);
    });
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }
}
