import { Component } from '@angular/core'; 
import { Router } from '@angular/router';
import { dataProvider } from '../../../providers/mikrowizard/data'; 
import { loginChecker } from '../../../providers/login_checker';
import { Validators, FormControl, FormGroup} from '@angular/forms';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  public loginForm: FormGroup;
  public forgotForm: FormGroup;
  public error_msg: string = "";
  public forgot_error_msg: string = "";
  public success_msg: string = "";
  public submitted = false;
  public forgot_page: boolean = false;
  public forgot_btn_disable: boolean = false;
  public show_otp: boolean = false;

	constructor(
		private router: Router,
		private data_provider: dataProvider,
		private login_checker: loginChecker,
	) {
		this.createForm();
	};

	createForm() {
		this.loginForm = new FormGroup({
			username: new FormControl(''),
			password: new FormControl(''),
			ga_code: new FormControl(''),
		});
		this.forgotForm = new FormGroup({
			email: new FormControl(''),
		});
	}	

  onClickSubmit(){
		var _self = this;
		let uname = _self.loginForm.get('username')!.value;
		let passwd = _self.loginForm.get('password')!.value;
		let ga_code = _self.loginForm.get('ga_code')!.value;
		_self.data_provider.login(uname, passwd, ga_code).then(res => {
			if('uid' in res && res['uid']){
				_self.error_msg = "";
				_self.login_checker.setStatus(true);
				_self.router.navigate(['/'], {replaceUrl: true});
			}
			else if('status' in res) {
				_self.error_msg = res['err'];
			}
			else if('otp' in res && res['otp']){
				this.show_otp=true;
			}
			else {
				_self.error_msg = 'Error: Problem in backend';
			}
		}).catch(err => {
			_self.error_msg = "Connection with backend broken!";
		});
	}

}
