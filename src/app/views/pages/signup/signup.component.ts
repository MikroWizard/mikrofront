import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { dataProvider } from '../../../providers/mikrowizard/data';
import { Validators, FormControl, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})
export class SignupComponent {
  public signupForm: FormGroup;
  public error_msg: string = "";
  public success_msg: string = "";
  public submitted = false;

  constructor(
    private router: Router,
    private data_provider: dataProvider,
  ) {
    this.createForm();
  }

  createForm() {
    this.signupForm = new FormGroup({
      username: new FormControl('', [Validators.required]),
      organization: new FormControl('', [Validators.required]),
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', [Validators.required, Validators.minLength(6)]),
      confirmPassword: new FormControl('', [Validators.required])
    });
  }

  onClickSubmit() {
    this.submitted = true;
    if (this.signupForm.invalid) {
      return;
    }

    const formData = this.signupForm.value;
    if (formData.password !== formData.confirmPassword) {
      this.error_msg = "Passwords do not match";
      return;
    }

    this.data_provider.signup(formData.username, formData.organization, formData.email, formData.password)
      .then(res => {
        if (res['status'] === 'success') {
          this.success_msg = "Registration successful! Please login.";
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        } else {
          this.error_msg = res['err'] || 'Registration failed';
        }
      })
      .catch(err => {
        this.error_msg = "Connection with backend broken!";
      });
  }
} 