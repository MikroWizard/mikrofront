import { Component, OnInit, ViewChildren ,QueryList} from "@angular/core";
import { dataProvider } from "../../providers/mikrowizard/data";
import { Router } from "@angular/router";
import { loginChecker } from "../../providers/login_checker";
import {
  GuiSelectedRow,
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
import { NgxSuperSelectOptions } from "ngx-super-select";
import { _getFocusedElementPierceShadowDom } from "@angular/cdk/platform";
import { formatInTimeZone } from "date-fns-tz";

import { ToasterComponent } from "@coreui/angular";
import { AppToastComponent } from "../toast-simple/toast.component";

@Component({
  templateUrl: "vault.component.html",
  styleUrls: ["vault.scss"],

})
export class VaultComponent implements OnInit {
  public uid: number;
  public uname: string;
  public ispro: boolean = false;
  public tz: string;
  
  constructor(
    private data_provider: dataProvider,
    private router: Router,
    private login_checker: loginChecker
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

  public settings:any=false;
  public new_password:any="";
  public new_exception:any="";
  public Members:any=false;
  public vault_history:any=false;
  public passwords:any=false;
  public password:string="";
  public PasswordModalVisible:boolean=false;
  public source: Array<any> = [];
  public columns: Array<GuiColumn> = [];
  public loading: boolean = true;
  public rows: any = [];
  public SelectedTask: any = {};
  public SelectedTaskItems: any = "";
  public runConfirmModalVisible: boolean = false;
  public DeleteConfirmModalVisible: boolean = false;
  public SelectedMembers: any = [];
  public NewMemberModalVisible: boolean = false;
  public availbleMembers: any = [];
  public NewMemberRows: any = [];
  public SelectedNewMemberRows: any;
  public filters_visible: boolean = false;
  public filters: any = {};
  public activetab:number=0;

  public sorting = {
    enabled: true,
    multiSorting: true,
  };
  searching: GuiSearching = {
    enabled: true,
    placeholder: "Search Devices",
  };

  toasterForm = {
    autohide: true,
    delay: 3000,
    position: "fixed",
    fade: true,
    closeButton: true,
  };

  options: Partial<NgxSuperSelectOptions> = {
    selectionMode: "single",
    actionsEnabled: false,
    displayExpr: "name",
    valueExpr: "id",
    placeholder: "Snippet",
    searchEnabled: true,
    enableDarkMode: false,
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

	reinitgrid(field: string, $event: any) {
		if (field == "username") this.filters["username"] = $event;
		else if (field == "dev_name") this.filters["dev_name"] = $event;
		else if (field == "dev_ip") this.filters["dev_ip"] = $event;
		this.get_passwords();
	}

  ngOnInit(): void {
    this.initGridTable();
    this.get_vault_history();
  }

  onSelectedRowsNewMembers(rows: Array<GuiSelectedRow>): void {
    this.NewMemberRows = rows;
    this.SelectedNewMemberRows = rows.map((m: GuiSelectedRow) => ({'id': m.source.id,'name':m.source.name}));
    
  }

	toggleCollapse(): void {
		this.filters_visible = !this.filters_visible;
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

  add_new_members() {
    var _self = this;
    //check if members not added already

    for (var i = 0; i < _self.SelectedNewMemberRows.length; i++) {
        if (!_self.Members.find((e:any) => e.id ===_self.SelectedNewMemberRows[i]['id'])) {
        _self.Members.push(_self.SelectedNewMemberRows[i]);
      }
    }
    _self.Members = _self.Members.filter((x: any) => x != "");
    // _self.Members = [
    //   ...new Set(_self.Members.concat(_self.SelectedNewMemberRows)),
    // ];

    this.NewMemberModalVisible = false;
  }
  
  delete_group(id:number){
    this.Members=this.Members.filter((x:any)=>x.id!=id);
  }

  get_member_by_id(id: string) {
    return this.Members.find((x: any) => x.id == id);
  }

  get_passwords(){
    var _self=this;
    this.data_provider.get_passwords(this.filters).then((res) => {
      _self.passwords=res.data.map((d: any) => {
        d.changed = formatInTimeZone(
          d.changed.split(".")[0] + ".000Z",
          _self.tz,
          "yyyy-MM-dd HH:mm:ss XXX"
        );
        return d;
      });
    });
  }

  reveal_password(devid:number,username:string){
    var _self=this;
    _self.password="";
    this.data_provider.reveal_password(devid,username).then((res) => {
      _self.password=res.password;
      _self.PasswordModalVisible=true;
    });
  }

  exec_vault(){
    var _self=this;
    this.data_provider.exec_vault().then((res) => {
      if('err' in res){
        _self.show_toast(
          "Error",
          res['err'],
          "danger"
        );
      }
      else{
        _self.show_toast(
          "Success",
          "Vault job executing",
          "success"
        );
      }
    });
  }

  add_password(){
    var _self=this;
    if(this.settings['passwords'].includes(this.new_password)){
      return;
    }
    else{
      this.settings.passwords.push(this.new_password);
      this.settings.passwords=this.settings.passwords.filter((x:any)=>x!="");
      this.new_password='';
    }
  }
  get_vault_history(){
    var _self=this;
    this.data_provider.vault_history().then((res) => {
      let index = 1;
      _self.vault_history=res.data.map((d: any) => {
        d.index = index;
        d.ended = formatInTimeZone(
          d.created.split(".")[0] + ".000Z",
          _self.tz,
          "yyyy-MM-dd HH:mm:ss XXX"
        );
        d.info=JSON.parse(d.info);
        d.started = formatInTimeZone(
          d.info.created.split(".")[0] + ".000Z",
          _self.tz,
          "yyyy-MM-dd HH:mm:ss XXX"
        );
        d.start_ip=d.info.start_ip;
        d.end_ip=d.info.end_ip;
        d.result=JSON.parse(d.result);
        index += 1;
        return d;
        });
    });
  }
  
  sanitizeString(desc:string) {
    var itemDesc:string='';
    if (desc) {
        itemDesc = desc.toString().replace(/"/g, '\"');
        itemDesc = itemDesc.replace(/'/g, '\'');
    } else {
        itemDesc = '';
    }
    return itemDesc;
  }

  exportToCsv(jsonResponse:any) {
    const data = jsonResponse;
    const columns = this.getColumns(data);
    const csvData = this.convertToCsv(data, columns);
    this.downloadFile(csvData, 'data.csv', 'text/csv');
  }

  getColumns(data: any[]): string[] {
    const columns : any  = [];
    data.forEach(row => {
      Object.keys(row).forEach((col) => {
        if (!columns.includes(col)) {
          columns.push(col);
        }
      });
    });
    return columns;
  }

  convertToCsv(data: any[], columns: string[]): string {
    var _self=this;
    let csv = '';
    csv += columns.join(',') + '\n';
    data.forEach(row => {
      const values : any = [];
      columns.forEach((col:any) => {
        values.push('"'+_self.sanitizeString(row[col])+'"');
      });
      csv += values.join(',') + '\n';
    });
    return csv;
  }

  downloadFile(data: string, filename: string, type: string) {
    const blob = new Blob([data], { type: type });
    const nav = (window.navigator as any);

    if (nav.msSaveOrOpenBlob) {
		nav.msSaveBlob(blob, filename);
    } else {
      const link = document.createElement('a');
      link.setAttribute('href', URL.createObjectURL(blob));
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  show_new_member_form() {
    this.NewMemberModalVisible = false;
    var _self = this;
    _self.availbleMembers = [];
    this.SelectedNewMemberRows = [];
    this.NewMemberRows = [];

    var data = {
      group_id: false,
      search: false,
      page: false,
      size: 10000,
    };

    _self.data_provider.get_devgroup_list().then((res) => {
      _self.availbleMembers = res.filter(
        (x: any) => !_self.SelectedTaskItems.includes(x.id)
      );
      _self.NewMemberModalVisible = true;
    });
    
  }

  remove_password(item:string){
    var _self=this;
    this.settings.passwords=this.settings.passwords.filter((x:any)=>x!=item);
  }
  add_exception(){
    var _self=this;
    if(this.settings['exceptions'].includes(this.new_exception)){
      return;
    }
    else{
      this.settings.exceptions.push(this.new_exception);
      this.settings.exceptions=this.settings.exceptions.filter((x:any)=>x!="");
      this.new_exception='';
    }
  }
  remove_exception(item:string){
    var _self=this;
    this.settings.exceptions=this.settings.exceptions.filter((x:any)=>x!=item);
  }
  save_settings(){
    var _self=this;
    this.settings['action']='update'
    this.settings['members']=this.Members.map((x:any) => x.id);
    if(this.settings['enable']=='disable')
      this.settings['action']='disable';
    this.data_provider.vault_task(this.settings).then((res) => {
      if('err' in res){
        _self.show_toast(
          "Error",
          res['err'],
          "danger"
        );
      }
      else{
        _self.show_toast(
          "Success",
          "Settings saved",
          "success"
        );
        _self.initGridTable();
      }
    });
  }



  logger(item: any) {
    console.dir(item);
  }

  initGridTable(): void {
    var _self = this;
    this.data_provider.get_vault_setting().then((res) => {
      _self.settings=res.data;
      _self.Members=res.members;
    })
    this.data_provider.get_user_task_list().then((res) => {
      _self.source = res.map((x: any) => {
        return x;
      });
      _self.loading = false;
    });
  }
}
