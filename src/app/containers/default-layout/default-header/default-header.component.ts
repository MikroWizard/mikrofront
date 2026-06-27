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
  @Output() ConfirmModalEvent = new EventEmitter<any>();

  public newMessages = new Array(4)
  public newTasks = new Array(5)
  public newNotifications = new Array(5)
  public current_user: User;

  public uid: number;
  public uname: string;
  public fname: string;
  public lname: string;
  public ConfirmModalVisible : boolean = false;
  public tasks : any = [];
  public timer : any;

  public selectedDeviceId: number | null = null;
  public devices: any[] = [];

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
  callParentConfirm(action:string,data:any): void {
    this.ConfirmModalEvent.next({action:action,data:data});
  }
  logout() {
    this.data_provider.logout().then(res => {
      this.router.navigate(['login']);
    })
  }

  loadCustomerDevices() {
    this.data_provider.customerGetDevices().then((res: any) => {
      const data = res.result || res || [];
      if (Array.isArray(data) && data.length > 0) {
        this.devices = data;
        const cached = localStorage.getItem('customer_selected_device_id');
        if (cached && this.devices.some(d => +d.id === +cached)) {
          this.selectedDeviceId = +cached;
        } else {
          this.selectedDeviceId = +this.devices[0].id;
          localStorage.setItem('customer_selected_device_id', this.selectedDeviceId.toString());
        }
        setTimeout(() => {
          this.emitDeviceChange();
        }, 150);
      }
    });
  }

  onDeviceChange() {
    if (this.selectedDeviceId) {
      localStorage.setItem('customer_selected_device_id', this.selectedDeviceId.toString());
      this.emitDeviceChange();
    }
  }

  emitDeviceChange() {
    const event = new CustomEvent('customerDeviceChanged', { detail: this.selectedDeviceId });
    window.dispatchEvent(event);
  }

  ngOnInit(): void {
    var _self = this;
    console.log('DefaultHeaderComponent');
    this.get_user_info();
    if (this.current_user && this.current_user.role === 'customer') {
      this.loadCustomerDevices();
      return;
    }
    this.data_provider.get_running_tasks().then(res => {
      if (res && res['tasks']) {
        _self.tasks = res['tasks'].filter((x:any) => x.status);
      }
    })
    // get running tasks every 5 seconds
    this.timer=setInterval(function(){
      _self.get_running_tasks();
    }, 5000);
  }
  
  get_running_tasks(){
    var _self = this;
    if (this.current_user && this.current_user.role === 'customer') {
      return;
    }
    this.data_provider.get_running_tasks().then(res => {
      if (res && res['tasks']) {
        _self.tasks = res['tasks'].filter((x:any) => x.status);
      }
    })
  }
  ngOnDestroy(): void {
    clearInterval(this.timer);
  }



}
