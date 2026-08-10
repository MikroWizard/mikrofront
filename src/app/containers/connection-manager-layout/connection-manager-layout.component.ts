import { Component, OnInit, OnDestroy, EventEmitter, Output } from '@angular/core';
import { Router } from '@angular/router';
import { dataProvider } from '../../providers/mikrowizard/data';
import { User } from '../../providers/mikrowizard/user';

@Component({
  selector: 'app-connection-manager-layout',
  templateUrl: './connection-manager-layout.component.html',
  styleUrls: ['./connection-manager-layout.component.scss']
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

  constructor(
    private router: Router,
    private data_provider: dataProvider
  ) {
    const session_info: string = localStorage.getItem('current_user') || "[]";
    this.current_user = JSON.parse(session_info);
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
