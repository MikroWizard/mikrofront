import { Component, OnInit, OnDestroy, Inject, Renderer2, ViewChild, ElementRef, TemplateRef } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { dataProvider } from '../../providers/mikrowizard/data';
import { Router } from "@angular/router";
import { loginChecker } from '../../providers/login_checker';
import { HttpClient, HttpClientModule, HttpParams } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { GuiCellView,GuiSearching, GuiSelectedRow, GuiInfoPanel, GuiColumn, GuiColumnMenu, GuiDataType, GuiPaging, GuiPagingDisplay, GuiRowColoring, GuiRowSelectionMode, GuiRowSelection, GuiRowSelectionType } from '@generic-ui/ngx-grid';

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
	templateUrl: 'snippets.component.html',
})

export class SnippetsComponent implements OnInit, OnDestroy  {
	public uid: number;
	public uname: string;

	constructor(
		private data_provider: dataProvider,
		private router: Router,
		private login_checker: loginChecker,
		private renderer: Renderer2,
		private httpClient: HttpClient,
		@Inject(DOCUMENT) _document?: any,
	) {
		var _self = this;
		if (!this.login_checker.isLoggedIn()) {
			// setTimeout(function() {
			// 		_self.router.navigate(['login']);
			// 	}, 100);
		}
		this.data_provider.getSessionInfo().then(res => {
			// console.dir("res",res)
			_self.uid = res.uid;
			_self.uname = res.name;
			// console.dir("role",res.role);
			const userId = _self.uid;

			if (res.role != "admin") {
				// console.dir(res.role);
				setTimeout(function () {
					_self.router.navigate(['/user/dashboard']);
				}, 100);
			}
		});
		//get datagrid data
		function isNotEmpty(value: any): boolean {
			return value !== undefined && value !== null && value !== "";
		}
	}
	@ViewChild('nameSummaryCell')
	nameSummaryCell: TemplateRef<any>;
	public source: Array<any> = [];
	public columns: Array<GuiColumn> = [];
	public loading: boolean = true;
	public rows: any=[];
	public Selectedrows: any;
	public EditModalVisible:boolean=false;
	public ModalAction:string="checkfirm";
	public lineNum:number=0;
	public DeleteConfirmModalVisible:boolean = false;
	public SelectedSnippet:any={'name':'',};

	public current_snippet:any={
		"content": "",
		"created": "",
		"description": "",
		"id": 0,
		"name": ""
	};

	public default_snippet:any={
		"content": "",
		"created": "",
		"description": "",
		"id": 0,
		"name": ""
	};

	public sorting = {
		enabled: true,
		multiSorting: true
	};
	
	public ip_scanner:any;
	
	searching: GuiSearching = {
		enabled: true,
		placeholder: 'Search Devices'
	};

	public paging: GuiPaging = {
		enabled: true,
		page: 1,
		pageSize: 10,
		pageSizes: [5, 10, 25, 50],
		display: GuiPagingDisplay.ADVANCED
	};

	public columnMenu: GuiColumnMenu = {
		enabled: true,
		sort: true,
		columnsManager: true
	};

	public infoPanel: GuiInfoPanel = {
		enabled: true,
		infoDialog: false,
		columnsManager: true,
		schemaManager: true
	};

	public rowSelection: boolean | GuiRowSelection = {
		enabled: true,
		type: GuiRowSelectionType.CHECKBOX,
		mode: GuiRowSelectionMode.MULTIPLE,
	};


	ngOnInit(): void {
		this.initGridTable();
	}

	confirm_delete(item: any="",del:boolean=false) {
		if (!del){
			this.SelectedSnippet={...item};
			this.DeleteConfirmModalVisible = true;
			console.dir(this.SelectedSnippet);
		}
		else{
			var _self=this;
			this.data_provider.delete_snippet(_self.SelectedSnippet['id']).then(res => {
				_self.initGridTable();
				_self.DeleteConfirmModalVisible = false;
			});

		}
		
	}

	Edit_Snippet(item: any,action:string="showadd") {
		
		if(action=="showadd"){
			this.current_snippet={...this.default_snippet};
			this.EditModalVisible=true;
			this.ModalAction="add";
		}
		else{
			this.current_snippet=item;
			this.EditModalVisible=true;
			this.lineNum = this.current_snippet['content'].match(/\n/g) .length ;

			this.ModalAction="edit";
		}

	}

	calcline($ev:any){
		if($ev)
			this.lineNum = $ev.match(/\n/g) .length ;
		else
			this.lineNum = 0;
	}

	save_snippet(){
		this.data_provider.save_snippet(this.current_snippet).then(res =>{
			this.EditModalVisible=false;
			this.initGridTable();
		})
	}

	onSelectedRows(rows: Array<GuiSelectedRow>): void {
		this.rows = rows;
		this.Selectedrows = rows.map((m: GuiSelectedRow) => m.source.id);
	}

	remove(item: any) {
		console.dir(item);
	}

	logger(item: any) {
		console.dir(item)
	}

	initGridTable(): void {
		var _self=this;
		_self.data_provider.get_snippets("","","",0,1000).then(res => {
			_self.source =res.map( (x:any) => {
				x.created = [x.created.split("T")[0],x.created.split("T")[1].split(".")[0]].join(" ")
				return x;

			});
			_self.loading = false;
		});
	}


	ngOnDestroy(): void {
	}
}
