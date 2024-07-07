export class User {
	name: string;
	username: string;
	firstname: string;
	lastname: string;
	partner_id: number; 
	id: number;
	role: string;
	perms:any;
	tz:string;
	constructor(name: any, username: any, partner_id: any, user_id: any,firstname: any,lastname: any,role: any,perms:any,tz:string) {		this.name = name;
		this.username = username;
		this.partner_id = partner_id;
		this.id = user_id;
		this.firstname = firstname;
		this.lastname = lastname;
		this.role = role;
		this.perms = perms;
		this.tz=tz;
	}
}
