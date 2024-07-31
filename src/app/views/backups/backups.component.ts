import { Component, OnInit, QueryList, ViewChildren } from "@angular/core";
import { dataProvider } from "../../providers/mikrowizard/data";
import { Router, ActivatedRoute } from "@angular/router";
import { loginChecker } from "../../providers/login_checker";
import {
	GuiSearching,
	GuiInfoPanel,
	GuiColumn,
	GuiColumnMenu,
	GuiPaging,
	GuiPagingDisplay,
	GuiRowSelectionMode,
	GuiRowSelection,
	GuiRowSelectionType,
} from "@generic-ui/ngx-grid";
import { formatInTimeZone } from "date-fns-tz";
import { ToasterComponent } from "@coreui/angular";
import { AppToastComponent } from "../toast-simple/toast.component";

@Component({
	templateUrl: "backups.component.html",
	styleUrls: ["backups.component.scss"],
})
export class BackupsComponent implements OnInit {
	public uid: number;
	public uname: string;
	public tz: string = "UTC";
	public filterText: string;
	public filters: any = {};
	public codeForHighlightAuto: string = "";
	public ispro: boolean = false;
	public ConfirmModalVisible: boolean = false;
	public CompareModalVisible: boolean = false;
	public compareitems:any=[];
	public comparecontents:any=[];
	public compare_type="unified";
	public copy_msg:boolean=false;
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
	@ViewChildren(ToasterComponent) viewChildren!: QueryList<ToasterComponent>;

	public source: Array<any> = [];
	public columns: Array<GuiColumn> = [];
	public loading: boolean = true;
	public rows: any = [];
	public Selectedrows: any;
	public BakcupModalVisible: boolean = false;
	public devid: number = 0;
	public filters_visible: boolean = false;
	public currentBackup:any=false;
	public sorting = {
		enabled: true,
		multiSorting: true,
	};
	searching: GuiSearching = {
		enabled: true,
		placeholder: "Search Devices",
	};
	public paging: GuiPaging = {
		enabled: true,
		page: 1,
		pageSize: 10,
		pageSizes: [5, 10, 25, 50],
		display: GuiPagingDisplay.ADVANCED,
	};

	toasterForm = {
		autohide: true,
		delay: 3000,
		position: "fixed",
		fade: true,
		closeButton: true,
	};
	
	public columnMenu: GuiColumnMenu = {
		enabled: true,
		sort: true,
		columnsManager: true,
	};

	public infoPanel: GuiInfoPanel = {
		enabled: true,
		infoDialog: false,
		columnsManager: true,
		schemaManager: true,
	};

	public rowSelection: boolean | GuiRowSelection = {
		enabled: true,
		type: GuiRowSelectionType.CHECKBOX,
		mode: GuiRowSelectionMode.MULTIPLE,
	};

	ngOnInit(): void {
		this.devid = Number(this.route.snapshot.paramMap.get("devid"));
		if (this.devid > 0) {
			this.filters["devid"] = this.devid;
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
		this.loading = true;
		this.currentBackup = backup;
		this.data_provider.get_backup(backup.id).then((res) => {
			if('content' in res){
				_self.codeForHighlightAuto = res.content;
				_self.loading = false;
				_self.BakcupModalVisible = true;
			}
			else{
				this.show_toast('Error', 'Error loading backup file', 'danger')
			}
		});
	}

	toggleCollapse(): void {
		this.filters_visible = !this.filters_visible;
	}
	restore_backup(apply:boolean=false){
		var _slef=this;
		if (!apply){
			this.ConfirmModalVisible = true;
			return;
		}
		if (!this.currentBackup)
			return;
		if(apply){
			_slef.ConfirmModalVisible = false;
			_slef.BakcupModalVisible = true;
			this.show_toast('Success', 'Backup restored successfully', 'success')
			this.show_toast('Info', 'Wait for the router to reboot and apply config', 'info')
			this.data_provider.restore_backup(this.currentBackup.id).then((res) => {
				if ('status' in res){
					if(res['status']=='success'){
						this.show_toast('Success', 'Backup restored successfully', 'success')
						this.show_toast('Info', 'Wait for the router to reboot and apply config', 'info')
					}
					else
						this.show_toast('Error', 'Error restoring backup', 'danger')
				}
			});
		}
	}
	start_compare(){
		var _self=this;
		this.comparecontents=[]
		this.compareitems.forEach((element:any) => {
			_self.data_provider.get_backup(element.id).then((res) => {
				if('content' in res){
					_self.comparecontents.push(res.content);
				}
				if(_self.comparecontents.length==_self.compareitems.length)
					_self.CompareModalVisible=true;
			});
		});
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
	delete_compare(i:number){
		//delete item index i from compareitems
		this.compareitems.splice(i,1);

	}
	reinitgrid(field: string, $event: any) {
		if (field == "start") this.filters["start_time"] = $event.target.value;
		else if (field == "end") this.filters["end_time"] = $event.target.value;
		else if (field == "search") this.filters["search"] = $event;
		this.initGridTable();
	}
	
	initGridTable(): void {
		var _self=this;
		this.data_provider.get_backups(this.filters).then((res) => {
			let index = 1;
			this.source = res.map((d: any) => {
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
