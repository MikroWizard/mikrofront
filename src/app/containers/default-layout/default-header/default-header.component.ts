import { Component, Input ,Output,EventEmitter} from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { loginChecker } from '../../../providers/login_checker';
import { Router } from "@angular/router";
import { dataProvider } from '../../../providers/mikrowizard/data';
import { User } from '../../../providers/mikrowizard/user';

import { ClassToggleService, HeaderComponent } from '@coreui/angular';

@Component({
  selector: 'app-default-header',
  templateUrl: './default-header.component.html',
})
export class DefaultHeaderComponent extends HeaderComponent {

  @Input() sidebarId: string = "sidebar";
  @Output() UserModalEvent = new EventEmitter<any>();

  public newMessages = new Array(4)
  public newTasks = new Array(5)
  public newNotifications = new Array(5)
  public current_user: User;

  public uid: number;
  public uname: string;
  public fname: string;
  public lname: string;
  public UserProfileModalVisible : boolean = false;

  constructor(
    private classToggler: ClassToggleService,
    private router: Router,
    private login_checker: loginChecker,
		private data_provider: dataProvider,
  ) {
    super();
    var _self = this;
    var session_info: string = localStorage.getItem('current_user') || "[]";
    this.current_user = JSON.parse(session_info);
  }

  submit(){
  }

  get_user_info() {
    var _self = this;
    this.uid = this.current_user.partner_id;
    this.uname = this.current_user.name;
    this.fname = this.current_user.firstname;
    this.lname = this.current_user.lastname;
  }

  callParent(action:string): void {
    this.UserModalEvent.next(action);
  }

  logout() {
    this.data_provider.logout().then(res => {
      this.router.navigate(['login']);
    })
  }

  ngOnInit(): void {
    var _self = this;
    this.get_user_info();
  }
}
