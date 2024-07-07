import { Component, OnInit } from "@angular/core";
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

interface IUser {
	name: string;
	state: string;
	registered: string;
	country: string;
	usage: number;
	period: string;
	payment: string;
	activity: string;
	avatar: string;
	status: string;
	color: string;
}

@Component({
	templateUrl: "backups.component.html",
})
export class BackupsComponent implements OnInit {
	public uid: number;
	public uname: string;
	public tz: string = "UTC";
	public filterText: string;
	public filters: any = {};
	public codeForHighlightAuto: string = "";

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

	public source: Array<any> = [];
	public columns: Array<GuiColumn> = [];
	public loading: boolean = true;
	public rows: any = [];
	public Selectedrows: any;
	public BakcupModalVisible: boolean = false;
	public devid: number = 0;

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
		this.initGridTable();
	}

	logger(item: any) {
		console.dir(item);
	}

	ShowBackup(id: number) {
		this.BakcupModalVisible = true;
		this.loading = true;
		this.data_provider.get_backup(id).then((res) => {
			this.codeForHighlightAuto = res.content;
			this.loading = false;
		});
	}

	initGridTable(): void {
		var _self=this;
		this.data_provider.get_backups(this.devid, 0, 0, false).then((res) => {
			let index = 1;
			this.source = res.map((d: any) => {
				d.index = index;
				d.createdC = formatInTimeZone(
					d.created.split(".")[0] + ".000Z",
					_self.tz,
					"yyyy-MM-dd HH:mm:ss XXX"
				);
				// d.created = [d.created.split("T")[0],d.created.split("T")[1].split(".")[0]].join(" ")
				index += 1;
				return d;
			});
			console.dir(this.source);
			this.loading = false;
		});
	}
}
