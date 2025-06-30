import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { dataProvider } from './mikrowizard/data';

@Injectable()
export class loginChecker {
	private is_logged_in: boolean = false;
	private public_routes = ['/login', '/signup'];

	constructor(
		private router: Router,
		private data_provider: dataProvider
	) {
		this.router.events.subscribe((event) => {
			if (event instanceof NavigationEnd) {
				const currentRoute = event.url;
				if (!this.is_logged_in && !this.public_routes.includes(currentRoute)) {
					this.router.navigate(['/login']);
				}
			}
		});
	}

	isLoggedIn() {
		return this.is_logged_in;
	}

	setStatus(status: boolean) {
		this.is_logged_in = status;
	}

	load() {
		return new Promise((resolve, reject) => {
			this.data_provider.getSessionInfo().then(res => {
				if ('uid' in res && res['uid']) {
					this.is_logged_in = true;
				} else {
					this.is_logged_in = false;
				}
				resolve(true);
			}).catch(err => {
				this.is_logged_in = false;
				resolve(true);
			});
		});
	}
}