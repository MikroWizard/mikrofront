import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from "@angular/router";
import { loginChecker } from '../../providers/login_checker';
import { User } from '../../providers/mikrowizard/user';
import { navItems } from './_nav';
import { dataProvider } from '../../providers/mikrowizard/data';
import { version } from 'os';

@Component({
  selector: 'app-dashboard',
  templateUrl: './default-layout.component.html',
  styleUrls: ['./default-layout.component.scss'],
})
export class DefaultLayoutComponent implements OnInit {

  public navItems = navItems;
  public current_user: User;
  public uid: number;
  public uname: string;
  public fname: string;
  public lname: string;
  public UserProfileModalVisible:boolean;
  public error:any=false;
  public password:any={
    'cupass':'',
    'pass1':'',
    'pass2':''
  };

  public passvalid:any={
    'cupass':false,
    'pass1':false,
    'pass2':false
  };
  version=require('../../../../package.json').version;

  constructor(
    private router: Router,
    private login_checker: loginChecker,
		private data_provider: dataProvider,

  ) {
    var _self = this;
    var session_info: string = localStorage.getItem('current_user') || "[]";
    this.current_user = JSON.parse(session_info);
    this.router.events.subscribe((ev) => {
      if (ev instanceof NavigationEnd) {
        if (!this.login_checker.isLoggedIn()) {
          setTimeout(function () {
            _self.router.navigate(['login']);
          }, 100);
        }
      }
    });
  }

  password_changed(variable:string,value:any){
    var _self=this;
    this.password[variable]=value;
    console.dir(this.password['pass1']);
    console.dir(this.password['pass2']);
    if(this.password['pass1']==this.password['pass2']){
      _self.passvalid['pass2']=true;
    }
    else{
      _self.passvalid['pass2']=false;
    }
  }
  
  show_user_modal(){
    this.UserProfileModalVisible = true;
  }

  submit(){
    var _self=this;
    if(!_self.passvalid['pass2']){
      return;
    }
    this.data_provider.change_password(this.password['cupass'], this.password['pass1']).then(res => {
        if(res['status']=='success'){
          _self.logout();
          setTimeout(function () {
            _self.router.navigate(['login']);
          }, 100);
        }
        else{
          _self.error=res['err'];
        }
      },
      (err) => {
        console.dir(err);
      }
    );
  }


  get_user_info() {
    var _self = this;
    this.uid = this.current_user.partner_id;
    this.uname = this.current_user.name;
    this.fname = this.current_user.firstname;
    this.lname = this.current_user.lastname;
  }

  logout() {
    this.data_provider.logout();
  }

  ngOnInit(): void {
    var _self = this;
    this.get_user_info();
    _self.data_provider.get_front_version().then((res:any) => {
			console.log("ressssssssssssssssss");
      console.dir(res['version']);
      console.dir(this.version);
      if(res['version']!=this.version){
        console.dir("New version is available. Please refresh the page.");
        window.location.href = window.location.href.replace(/#.*$/, '');


      }
		});
  }
  
}
