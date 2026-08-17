import { Component, OnInit, QueryList, ViewChildren, ViewChild } from "@angular/core";
import { dataProvider } from "../../providers/mikrowizard/data";
import { Router, ActivatedRoute } from "@angular/router";
import { loginChecker } from "../../providers/login_checker";
import { Table } from 'primeng/table';
import { formatInTimeZone } from "date-fns-tz";
import { ToasterComponent } from "@coreui/angular";
import { AppToastComponent } from "../toast-simple/toast.component";

@Component({
	templateUrl: "backups.component.html",
	styleUrls: ["backups.component.scss"],
})
export class BackupsComponent implements OnInit {
	public uid: number = 0;
	public uname: string = '';
	public tz: string = "UTC";
	public filterText: string = '';
	public filters: any = {};
	public codeForHighlightAuto: string = "";
	public ispro: boolean = false;
	public ConfirmModalVisible: boolean = false;
	public CriticalConfirmModalVisible: boolean = false;
	public CompareModalVisible: boolean = false;
	public compareitems:any=[];
	public comparecontents:any=[];
	public compare_type: string = "sided";
	public compareLoading: boolean = false;
	public copy_msg:boolean=false;
	public confirmationText: string = '';

	public exportModalVisible: boolean = false;
	public exportColumns = [
		{ field: 'id', label: 'ID', selected: true },
		{ field: 'devname', label: 'Device Name', selected: true },
		{ field: 'devip', label: 'Device IP', selected: true },
		{ field: 'createdC', label: 'Created At', selected: true },
		{ field: 'filesize', label: 'File Size', selected: true },
		{ field: 'source', label: 'Source', selected: true },
		{ field: 'source_name', label: 'Source Name', selected: true },
		{ field: 'command', label: 'Command', selected: true },
		{ field: 'checksum', label: 'Checksum', selected: false }
	];

	openExportModal() {
		this.exportModalVisible = true;
	}
	
	constructor(
		private data_provider: dataProvider,
		private router: Router,
		private login_checker: loginChecker,
		private route: ActivatedRoute
	) {
		var _self = this;
		if (!this.login_checker.isLoggedIn()) {
			setTimeout(function () {
				_self.router.navigate(["login"]);
			}, 100);
		}
		this.data_provider.getSessionInfo().then((res) => {
			_self.uid = res.uid;
			_self.uname = res.name;
			_self.tz = res.tz;
			_self.ispro = res['ISPRO']

			const userId = _self.uid;

			if (res.role != "admin") {
				setTimeout(function () {
					_self.router.navigate(["/user/dashboard"]);
				}, 100);
			}
		});
		//get datagrid data
		function isNotEmpty(value: any): boolean {
			return value !== undefined && value !== null && value !== "";
		}
	}
	@ViewChild("dt") table!: Table;
	@ViewChildren(ToasterComponent) viewChildren!: QueryList<ToasterComponent>;

	public source: Array<any> = [];
	public loading: boolean = true;
	public backuploading: boolean = false;
	public rows: any = [];
	public Selectedrows: any;
	public BakcupModalVisible: boolean = false;
	public devid: number = 0;
	public filters_visible: boolean = false;
	public currentBackup: any = false;
	public hlang: string = '';

	toasterForm = {
		autohide: true,
		delay: 3000,
		position: "fixed",
		fade: true,
		closeButton: true,
	};

	applyFilterGlobal($event: any, stringVal: string) {
		this.table.filterGlobal(($event.target as HTMLInputElement).value, stringVal);
	}

	ngOnInit(): void {
		this.devid = Number(this.route.snapshot.paramMap.get("devid"));
		if (this.devid > 0) {
			this.filters["devid"] = this.devid;
		}
		if (!this.filters["source"]) {
			this.filters["source"] = "backup";
		}
		this.initGridTable();
	}

	logger(item: any) {
		console.dir(item);
	}
	switch_compare_type(){
		if(this.compare_type=='unified')
			this.compare_type='sided'
		else
			this.compare_type='unified'
	}
	copy_this() {
		//show text copy to clipboard for 3 seconds
		this.copy_msg = true;
		setTimeout(() => {
		  this.copy_msg = false;
		}, 1000);
	  }
	
	show_toast(title: string, body: string, color: string) {
		const { ...props } = { ...this.toasterForm, color, title, body };
		const componentRef = this.viewChildren.first.addToast(
		  AppToastComponent,
		  props,
		  {}
		);
		componentRef.instance["closeButton"] = props.closeButton;
	}

	ShowBackup(backup: any) {
		var _self=this;
		this.backuploading = true;
		this.currentBackup = backup;
		_self.codeForHighlightAuto='';
		_self.BakcupModalVisible = true;
		this.data_provider.get_backup(backup.id).then((res) => {
			if('content' in res){
				console.dir(res.content.length);
				if(res.content.length>115000)
					_self.hlang='xml';
				else{
					_self.hlang='routeros'
				}
				_self.BakcupModalVisible = true;
				_self.codeForHighlightAuto = res.content;
				_self.backuploading = false;
			}
			else{
				this.show_toast('Error', 'Error loading backup file', 'danger')
			}
		});
	}
	
	toggleCollapse(): void {
		this.filters_visible = !this.filters_visible;
	}

	restore_backup(apply: boolean = false, doubleConfirmed: boolean = false, backup?: any) {
		var _self = this;
		
		// Set current backup if provided
		if (backup) {
			this.currentBackup = backup;
		}
		
		if (!apply) {
			// Step 1: Show initial confirmation
			this.ConfirmModalVisible = true;
			return;
		}
		
		if (!this.currentBackup) {
			return;
		}
		
		if (apply && !doubleConfirmed) {
			// Step 2: Show critical confirmation
			this.ConfirmModalVisible = false;
			this.CriticalConfirmModalVisible = true;
			this.confirmationText = '';
			return;
		}
		
		if (apply && doubleConfirmed) {
			// Step 3: Execute restore
			_self.CriticalConfirmModalVisible = false;
			_self.BakcupModalVisible = false;
			
			this.data_provider.restore_backup(this.currentBackup.id).then((res) => {
				if ('status' in res) {
					if (res['status'] == 'success') {
						this.show_toast('Success', 'Backup restored successfully', 'success');
						this.show_toast('Info', 'Wait for the router to reboot and apply config', 'info');
					} else {
						this.show_toast('Error', 'Error restoring backup', 'danger');
					}
				}
			});
		}
	}
	
	cancelCriticalRestore() {
		this.CriticalConfirmModalVisible = false;
		this.confirmationText = '';
		this.currentBackup = null;
	}

	start_compare() {
		if (this.compareitems.length < 2) {
			this.show_toast('Info', 'Select two backups to compare', 'info');
			return;
		}

		// Sort chronologically: older backup as [0] (Before / Original), newer as [1] (After / Modified)
		const sorted = [...this.compareitems].sort((a: any, b: any) => {
			const dateA = new Date(a.created).getTime();
			const dateB = new Date(b.created).getTime();
			if (!isNaN(dateA) && !isNaN(dateB) && dateA !== dateB) return dateA - dateB;
			return (a.id || 0) - (b.id || 0);
		});
		this.compareitems = sorted;

		this.comparecontents = [];
		this.compareLoading = true;

		const p1 = this.data_provider.get_backup(this.compareitems[0].id);
		const p2 = this.data_provider.get_backup(this.compareitems[1].id);

		Promise.all([p1, p2]).then(([res1, res2]: [any, any]) => {
			this.compareLoading = false;
			if (!res1 || !('content' in res1) || !res2 || !('content' in res2)) {
				this.show_toast('Error', 'Error loading backup files for comparison', 'danger');
				return;
			}
			if (res1.content.length > 500000 || res2.content.length > 500000) {
				this.show_toast('Error', 'The file is too big for comparing, Try accessing and comparing locally', 'danger');
				return;
			}
			// Normalize line endings to avoid false diffs
			const c1 = (res1.content || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
			const c2 = (res2.content || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
			this.comparecontents = [c1, c2];
			this.CompareModalVisible = true;
		}).catch(() => {
			this.compareLoading = false;
			this.show_toast('Error', 'Error loading backup files for comparison', 'danger');
		});
	}

	swap_compare() {
		if (this.compareitems.length >= 2 && this.comparecontents.length >= 2) {
			this.compareitems = [this.compareitems[1], this.compareitems[0]];
			this.comparecontents = [this.comparecontents[1], this.comparecontents[0]];
		}
	}

	add_for_compare(item:any){
		//Only two items for compare
		if(this.compareitems.length<2)
			this.compareitems.filter((i:any)=>{
				return i.id!=item.id;
			}).length==this.compareitems.length && this.compareitems.push(item);
		else{
			//remove first element and add new item
			this.compareitems.shift();
			this.compareitems.push(item);
		}
	}
	delete_compare(i: number) {
		// Delete item index i from compareitems
		this.compareitems.splice(i, 1);
	}
	
	clearAllCompare() {
		// Clear all compare items
		this.compareitems = [];
		this.comparecontents = [];
	}
	
	isInCompareList(item: any): boolean {
		// Check if item is already in compare list
		return this.compareitems.some((compareItem: any) => compareItem.id === item.id);
	}
	reinitgrid(field: string, $event: any) {
		if (field == "start") this.filters["start_time"] = $event.target.value;
		else if (field == "end") this.filters["end_time"] = $event.target.value;
		else if (field == "search") this.filters["search"] = $event;
		else if (field == "source") this.filters["source"] = $event;
		this.initGridTable();
	}
	
	initGridTable(): void {
		var _self=this;
		this.data_provider.get_backups(this.filters).then((res) => {
			let index = 1;
			this.source = (res || []).map((d: any) => {
				d.source = d.source || "backup";
				d.source_name = d.source_name || "";
				d.command = d.command || "";
				d.index = index;
				d.createdC = formatInTimeZone(
					d.created.split(".")[0] + ".000Z",
					_self.tz,
					"yyyy-MM-dd HH:mm:ss XXX"
				);
				index += 1;
				return d;
			});
			this.loading = false;
		});
	}
}
