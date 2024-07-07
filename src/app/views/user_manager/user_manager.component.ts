import { Component, OnInit, QueryList, ViewChildren } from "@angular/core";
import { dataProvider } from "../../providers/mikrowizard/data";
import { Router } from "@angular/router";
import { loginChecker } from "../../providers/login_checker";
import {
  GuiGridComponent,
  GuiColumn,
  GuiColumnMenu,
  GuiPaging,
  GuiPagingDisplay,
  GuiRowSelectionMode,
  GuiRowSelection,
  GuiRowSelectionType,
} from "@generic-ui/ngx-grid";
import { NgxSuperSelectOptions } from "ngx-super-select";
import { AppToastComponent } from "../toast-simple/toast.component";
import { ToasterComponent } from "@coreui/angular";

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
  templateUrl: "user_manager.component.html",
})
export class UserManagerComponent implements OnInit {
  public uid: number;
  public uname: string;
  gridComponent: GuiGridComponent;
  toasterForm = {
    autohide: true,
    delay: 10000,
    position: "fixed",
    fade: true,
    closeButton: true,
  };

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
  public loading: boolean = false;
  public rows: any = [];
  public SelectedUser: any = {};
  public SelectedUserItems: string = "";
  public EditTaskModalVisible: boolean = false;
  public DeleteConfirmModalVisible: boolean = false;
  public Members: any = "";

  public devgroup: any = {};
  public permission: any = {};
  public allDevGroups: any = [];
  public allPerms: any = [];
  public DeletePermConfirmModalVisible: boolean = false;
  public userperms: any = {};
  public adminperms: { [index: string]: string };
  public defadminperms: { [index: string]: string } = {
    device: "none",
    device_group: "none",
    task: "none",
    backup: "none",
    snippet: "none",
    accounting: "none",
    authentication: "none",
    users: "none",
    permissions: "none",
    settings: "none",
    system_backup: "none",
  };

  public sorting = {
    enabled: true,
    multiSorting: true,
  };

  options: Partial<NgxSuperSelectOptions> = {
    actionsEnabled: false,
    displayExpr: "name",
    valueExpr: "id",
    placeholder: "Members",
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

  setRadioValue(key: string, value: string): void {
    this.adminperms[key] = value;
  }

  public rowSelection: boolean | GuiRowSelection = {
    enabled: true,
    type: GuiRowSelectionType.CHECKBOX,
    mode: GuiRowSelectionMode.MULTIPLE,
  };

  ngOnInit(): void {
    this.initGridTable();
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

  submit(action: string) {
    var _self = this;
    if (action == "add") {
      if (_self.SelectedUser["role"] == "admin") {
        _self.adminperms = { ..._self.defadminperms };
        if (_self.userperms.length > 0) {
          _self.SelectedUser["userperms"] = _self.userperms;
        } else {
          _self.SelectedUser["userperms"] = [];
        }
      }
      _self.SelectedUser["adminperms"] = _self.adminperms;
      this.data_provider.create_user(_self.SelectedUser).then((res) => {
        if ("id" in res && !("status" in res)) {
          _self.initGridTable();
          this.EditTaskModalVisible = false;
        } else {
          //show error
          _self.show_toast("Error", res.err, "danger");
        }
      });
    } else {
      _self.SelectedUser["adminperms"] = _self.adminperms;
      this.data_provider.edit_user(_self.SelectedUser).then((res) => {
        _self.initGridTable();
        _self.EditTaskModalVisible = false;
      });
    }
    //
  }

  editAddUser(item: any, action: string) {
    var _self = this;
    this.data_provider.get_perms(1, 1000, "").then((res) => {
      _self.allPerms = res.map((x: any) => {
        return { id: x["id"], name: x.name };
      });
      _self.data_provider.get_devgroup_list().then((res) => {
        _self.allDevGroups = res.map((x: any) => {
          return { id: x["id"], name: x.name };
        });
      });
    });
    if (action == "showadd") {
      this.userperms = [];
      this.SelectedUser = {
        email: "",
        first_name: "",
        fullname: "",
        last_name: "",
        role: "admin",
        password: "",
        action: "add",
      };
      this.adminperms = { ...this.defadminperms };
      this.EditTaskModalVisible = true;
      return;
    }
    this.SelectedUser = { ...item };
    if (this.SelectedUser["adminperms"].length > 0) {
      this.adminperms = JSON.parse(this.SelectedUser["adminperms"]);
    } else this.adminperms = { ...this.defadminperms };
    _self.SelectedUser["action"] = "edit";
    _self.get_user_perms(_self.SelectedUser["id"]);
    _self.EditTaskModalVisible = true;
  }

  add_user_perm() {
    var _self = this;
    this.data_provider
      .Add_user_perm(
        this.SelectedUser["id"],
        this.permission["id"],
        this.devgroup["id"]
      )
      .then((res) => {
        _self.get_user_perms(_self.SelectedUser["id"]);
        _self.permission = 0;
        _self.devgroup = 0;
      });
  }

  add_new_user_perm() {
    var _self = this;
    const userperms = [..._self.userperms];
    userperms.push({
      group_id: this.devgroup["id"],
      group_name: this.devgroup["name"],
      perm_id: this.permission["id"],
      perm_name: this.permission["name"],
    });
    this.userperms = userperms;
  }

  confirm_delete(item: any = "", del: boolean = false) {
    if (!del) {
      this.SelectedUser = { ...item };
      this.DeleteConfirmModalVisible = true;
    } else {
      var _self = this;
      this.data_provider.delete_user(_self.SelectedUser["id"]).then((res) => {
        _self.initGridTable();
        _self.DeleteConfirmModalVisible = false;
      });
    }
  }

  get_user_perms(uid: string) {
    if (this.SelectedUser["action"] == "add") return;
    var _self = this;
    this.data_provider.user_perms(uid).then((res) => {
      _self.userperms = res;
    });
  }

  confirm_delete_perm(item: any) {
    this.data_provider.Delete_user_perm(item.id).then((res) => {
      this.get_user_perms(this.SelectedUser["id"]);
    });
  }
  logger(item: any) {
    console.dir(item);
  }

  initGridTable(): void {
    var _self = this;
    var page = 1;
    var pageSize = 10;
    var searchstr = "";
    this.data_provider.get_users(page, pageSize, searchstr).then((res) => {
      _self.source = res.map((x: any) => {
        return x;
      });
      _self.SelectedUser = {};
      _self.loading = false;
    });
  }
}
