import { Component, OnInit } from '@angular/core'; 
import { Router } from '@angular/router';
import { dataProvider } from '../../../providers/mikrowizard/data'; 
import { loginChecker } from '../../../providers/login_checker';
import { Validators, FormControl, FormGroup} from '@angular/forms';
import { MsalService } from '@azure/msal-angular';
import { loginRequest } from '../../../auth/msal-config';
import { appleConfig } from '../../../auth/apple-config';
import appleSignin from 'apple-signin-auth';

declare global {
    interface Window {
        AppleID: any;
    }
}

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
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
		private msalService: MsalService
	) {
		this.createForm();
	};

	ngOnInit() {
		// Check if user is already logged in with MSAL
		if (this.msalService.instance.getActiveAccount()) {
			this.handleMsalLogin();
		}

		// Initialize Apple Sign In
		this.initializeAppleSignIn();
	}

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

  loginWithOffice365() {
    this.msalService.loginPopup(loginRequest)
      .subscribe({
        next: (result) => {
          this.handleMsalLogin();
        },
        error: (error) => {
          this.error_msg = "Error during Office 365 login: " + error.message;
          console.error('MSAL login error:', error);
        }
      });
  }

  private handleMsalLogin() {
    const account = this.msalService.instance.getActiveAccount();
    if (account) {
      this.data_provider.loginWithOffice365(account.idTokenClaims)
        .then(res => {
          if ('uid' in res && res['uid']) {
            this.error_msg = "";
            this.login_checker.setStatus(true);
            this.router.navigate(['/'], { replaceUrl: true });
          } else {
            this.error_msg = 'Error: Problem with Office 365 login';
          }
        })
        .catch(err => {
          this.error_msg = "Connection with backend broken!";
          console.error('Backend error:', err);
        });
    }
  }

  private initializeAppleSignIn() {
    // Load Apple Sign In script
    const script = document.createElement('script');
    script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
    script.onload = () => {
      window.AppleID.auth.init({
        clientId: appleConfig.clientId,
        scope: appleConfig.scope,
        redirectURI: appleConfig.redirectURI,
        state: appleConfig.state,
        usePopup: appleConfig.usePopup
      });
    };
    document.body.appendChild(script);
    console.log(appleConfig);
  }

   
 

  loginWithApple() {
    window.AppleID.auth.signIn()
      .then((response: any) => {
        // Handle successful sign in
        this.handleAppleLogin(response);
      })
      .catch((error: any) => {
        this.error_msg = "Error during Apple login: " + error.message;
        console.error('Apple login error:', error);
      });
  }

  private handleAppleLogin(response: any) {
    console.log(JSON.stringify(response));
    this.data_provider.loginWithApple(response)
      .then(res => {
        if ('uid' in res && res['uid']) {
          this.error_msg = "";
          this.login_checker.setStatus(true);
          this.router.navigate(['/'], { replaceUrl: true });
        } else {
          this.error_msg = 'Error: Problem with Apple login';
        }
      })
      .catch(err => {
        this.error_msg = "Connection with backend broken!";
        console.error('Backend error:', err);
      });
  }
}
