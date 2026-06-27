import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { dataProvider } from '../../../providers/mikrowizard/data';
import { FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html'
})
export class RegisterComponent {
  public registerForm: FormGroup;
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
    this.registerForm = new FormGroup({
      username: new FormControl('', Validators.required),
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', [Validators.required, Validators.minLength(8)]),
      first_name: new FormControl('', Validators.required),
      last_name: new FormControl('', Validators.required),
      company: new FormControl('')
    });
  }

  onClickSubmit() {
    if (this.registerForm.invalid) {
      this.error_msg = "Please fill in all required fields correctly.";
      return;
    }

    this.submitted = true;
    this.error_msg = "";
    this.success_msg = "";

    const formData = this.registerForm.value;

    this.data_provider.customerRegister(formData).then(res => {
      this.submitted = false;
      if (res['status'] === 'success') {
        this.success_msg = res['message'] || "Registration successful! Verification email sent.";
        this.registerForm.reset();
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      } else {
        this.error_msg = res['err'] || "Failed to register. Please try again.";
      }
    }).catch(err => {
      this.submitted = false;
      this.error_msg = "Connection error with server.";
    });
  }
}
