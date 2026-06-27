import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { dataProvider } from '../../../providers/mikrowizard/data';
import { FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html'
})
export class ForgotPasswordComponent {
  public forgotForm: FormGroup;
  public error_msg: string = "";
  public success_msg: string = "";
  public submitted = false;

  constructor(
    private router: Router,
    private data_provider: dataProvider
  ) {
    this.createForm();
  }

  createForm() {
    this.forgotForm = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email])
    });
  }

  onClickSubmit() {
    if (this.forgotForm.invalid) {
      this.error_msg = "Please enter a valid email address.";
      return;
    }

    this.submitted = true;
    this.error_msg = "";
    this.success_msg = "";

    const email = this.forgotForm.get('email')!.value;

    this.data_provider.customerForgotPassword(email).then(res => {
      this.submitted = false;
      if (res['status'] === 'success') {
        this.success_msg = res['message'] || "If the email is registered, a password reset link has been sent.";
      } else {
        this.error_msg = res['err'] || "Failed to process request.";
      }
    }).catch(err => {
      this.submitted = false;
      this.error_msg = "Connection error with server.";
    });
  }
}
