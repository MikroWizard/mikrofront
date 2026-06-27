import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { dataProvider } from '../../../providers/mikrowizard/data';

@Component({
  selector: 'app-activate',
  templateUrl: './activate.component.html'
})
export class ActivateComponent implements OnInit {
  public loading = true;
  public success = false;
  public message = "";
  public error_msg = "";

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private data_provider: dataProvider
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.loading = false;
      this.success = false;
      this.error_msg = "Activation token is missing. Please check your email link.";
      return;
    }

    this.data_provider.customerActivate(token).then(res => {
      this.loading = false;
      if (res['status'] === 'success') {
        this.success = true;
        this.message = res['message'] || "Your account has been successfully verified and activated.";
      } else {
        this.success = false;
        this.error_msg = res['err'] || "Invalid or expired activation token.";
      }
    }).catch(err => {
      this.loading = false;
      this.success = false;
      this.error_msg = "An error occurred during verification. Please check your internet connection.";
    });
  }
}
