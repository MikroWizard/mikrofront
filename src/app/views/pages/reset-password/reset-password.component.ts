import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { dataProvider } from '../../../providers/mikrowizard/data';
import { FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html'
})
export class ResetPasswordComponent implements OnInit {
  public resetForm: FormGroup;
  public error_msg: string = "";
  public success_msg: string = "";
  public submitted = false;
  private token: string = "";

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private data_provider: dataProvider
  ) {
    this.createForm();
  }

  ngOnInit(): void {
    const tokenParam = this.route.snapshot.queryParamMap.get('token');
    if (!tokenParam) {
      this.error_msg = "Reset token is missing from the URL. Please verify your email link.";
      this.submitted = true;
    } else {
      this.token = tokenParam;
    }
  }

  createForm() {
    this.resetForm = new FormGroup({
      password: new FormControl('', [Validators.required, Validators.minLength(8)]),
      confirm_password: new FormControl('', Validators.required)
    });
  }

  onClickSubmit() {
    if (this.resetForm.invalid) {
      this.error_msg = "Please fill in all fields correctly (passwords must be at least 8 characters).";
      return;
    }

    const pass = this.resetForm.get('password')!.value;
    const confirmPass = this.resetForm.get('confirm_password')!.value;

    if (pass !== confirmPass) {
      this.error_msg = "Passwords do not match.";
      return;
    }

    this.submitted = true;
    this.error_msg = "";
    this.success_msg = "";

    const data = {
      token: this.token,
      password: pass
    };

    this.data_provider.customerResetPassword(data).then(res => {
      this.submitted = false;
      if (res['status'] === 'success') {
        this.success_msg = res['message'] || "Password reset successfully. Redirecting to login...";
        this.resetForm.reset();
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      } else {
        this.error_msg = res['err'] || "Failed to reset password. Token may be invalid or expired.";
      }
    }).catch(err => {
      this.submitted = false;
      this.error_msg = "Connection error with server.";
    });
  }
}
