import { Component, OnInit, QueryList, ViewChildren, ViewChild } from "@angular/core";
import { dataProvider } from "../../providers/mikrowizard/data";
import { Router } from "@angular/router";
import { loginChecker } from "../../providers/login_checker";
import { Table } from 'primeng/table';

import { ToasterComponent } from "@coreui/angular";
import { AppToastComponent } from "../toast-simple/toast.component";

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
  templateUrl: "permissions.component.html",
})
export class PermissionsComponent implements OnInit {
  public uid: number = 0;
  public uname: string = '';

  @ViewChild('dt') table!: Table;

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
  public loading: boolean = true;
  public rows: any = [];
  public SelectedPerm: any = {};
  public SelectedPermItems: string = "";

  public EditTaskModalVisible: boolean = false;
  public DeleteConfirmModalVisible: boolean = false;
  public Members: any = "";
  public SelectedMembers: any = [];

  public action: string = "add";
  public permid: number = 0;
  public permname: string = "";
  public perms: { [index: string]: boolean } = {
    api: false,
    ftp: false,
    password: false,
    read: false,
    romon: false,
    sniff: false,
    telnet: false,
    tikapp: false,
    winbox: false,
    dude: false,
    local: false,
    policy: false,
    reboot: false,
    "rest-api": false,
    sensitive: false,
    ssh: false,
    test: false,
    web: false,
    write: false,
  };

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
  show_toast(title: string, body: string, color: string) {
    const { ...props } = { ...this.toasterForm, color, title, body };
    const componentRef = this.viewChildren.first.addToast(
      AppToastComponent,
      props,
      {}
    );
    componentRef.instance["closeButton"] = props.closeButton;
  }

  ngOnInit(): void {
    this.initGridTable();
  }
  submit(action: string) {
    var _self = this;
    if (action == "add") {
      this.data_provider
        .create_perm(_self.permname, _self.perms)
        .then((res) => {
          if (res["status"] == "failed") {
            _self.show_toast(
              "Error",
              res.err,
              "danger"
            );
            return;
          } else {
            _self.initGridTable();
            this.EditTaskModalVisible = false;
          }
        });
    } else {
      this.data_provider
        .edit_perm(_self.permid, _self.permname, _self.perms)
        .then((res) => {
          if (res["status"] == "failed") {
            _self.show_toast(
              "Error",
              res.err,
              "danger"
            );
            return;
          } else {
            _self.initGridTable();
            this.EditTaskModalVisible = false;
          }
        });
    }
  }
  editAddTask(item: any, action: string) {
    if (action == "showadd") {
      this.permname = item["name"];
      this.perms = {
        api: false,
        ftp: false,
        password: false,
        read: false,
        romon: false,
        sniff: false,
        telnet: false,
        tikapp: false,
        winbox: false,
        dude: false,
        local: false,
        policy: false,
        reboot: false,
        "rest-api": false,
        sensitive: false,
        ssh: false,
        test: false,
        web: false,
        write: false,
      };
      this.permid = 0;
      this.action = "add";
      this.EditTaskModalVisible = true;
      return;
    }
    this.action = "edit";
    this.permname = item["name"];
    this.perms = item.perms;
    this.permid = item["id"];
    this.EditTaskModalVisible = true;
  }

  splitids(ids: string = "") {
    return ids.split(",");
  }

  get_member_by_id(id: string) {
    return this.Members.find((x: any) => x.id == id);
  }

  confirm_delete(item: any = "", del: boolean = false) {
    if (!del) {
      this.SelectedPerm = { ...item };
      this.DeleteConfirmModalVisible = true;
    } else {
      var _self = this;
      this.data_provider.delete_perm(_self.SelectedPerm["id"]).then((res) => {
        if ("error" in res && res.error.indexOf("Unauthorized")) {
          _self.show_toast(
            "Error",
            "You are not authorized to perform this action",
            "danger"
          );
        }
        else{
            if (res["status"] == "failed") {
              _self.show_toast(
                "Error",
                res.err,
                "danger"
              );
              return;
            }
            else{
              _self.initGridTable();
              _self.DeleteConfirmModalVisible = false;
            }
        }
      });
    }
  }

  logger(item: any) {
    console.dir(item);
  }

  initGridTable(): void {
    var _self = this;
    var page = 1;
    var pageSize = 10;
    var searchstr = "";
    this.data_provider.get_perms(page, pageSize, searchstr).then((res) => {
      _self.source = res.map((x: any) => {
        return x;
      });
      _self.loading = false;
    });
  }
}
