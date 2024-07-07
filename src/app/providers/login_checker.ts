import { Injectable } from '@angular/core';
import { dataProvider } from './mikrowizard/data';

@Injectable()
export class loginChecker {
	private logged_in: boolean = false;
	private pinging: boolean = false;

	constructor(private data_provider: dataProvider) {
	}
	public isLoggedIn(): boolean {
		return this.logged_in;
	}
	load() {
		var _self = this;
		return this.data_provider.isLoggedIn().then(result => {
			_self.logged_in = result;
		}).catch(err => {
			_self.logged_in = false;
		})
	}
	setStatus(status: boolean): void {
		this.logged_in = status;
	}
	setPinging(ping: boolean): void {
		this.pinging = ping;
	}
}