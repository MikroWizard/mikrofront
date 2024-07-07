import { Component, OnInit } from "@angular/core";
import { dataProvider } from "../../providers/mikrowizard/data";
import { Router } from "@angular/router";
import { loginChecker } from "../../providers/login_checker";
import {
  GuiSearching,
  GuiSelectedRow,
  GuiInfoPanel,
  GuiColumn,
  GuiColumnMenu,
  GuiPaging,
  GuiPagingDisplay,
  GuiRowSelectionMode,
  GuiRowSelection,
  GuiRowSelectionType,
} from "@generic-ui/ngx-grid";

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
  templateUrl: "devgroup.component.html",
})
export class DevicesGroupComponent implements OnInit {
  public uid: number;
  public uname: string;

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
  public source: Array<any> = [];
  public columns: Array<GuiColumn> = [];
  public loading: boolean = true;
  public MemberRows: any = [];
  public NewMemberRows: any = [];

  public SelectedMemberRows: any;
  public SelectedNewMemberRows: any;
  public ConfirmModalVisible: boolean = false;
  public ConfirmAction: string = "delete";
  public EditGroupModalVisible: boolean = false;
  public NewMemberModalVisible: boolean = false;
  public groupMembers: any = [];
  public availbleMembers: any = [];
  public currentGroup: any = {
    array_agg: [],
    created: "",
    id: 0,
    name: "",
  };
  public DefaultCurrentGroup: any = {
    array_agg: [],
    created: "",
    id: 0,
    name: "",
  };
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
    this.initGridTable();
  }

  public show_members(id: number) {
    this.router.navigate(["devices", { id: id }]);
  }

  public show_delete_group(item: any) {
    this.currentGroup = item;
    this.ConfirmModalVisible = true;
    this.ConfirmAction = "delete";
  }
  public delete_group() {
    var _self = this;
    this.data_provider.delete_group(this.currentGroup.id).then((res) => {
      _self.initGridTable();
      _self.ConfirmModalVisible = false;
    });
  }

  onSelectedRowsMembers(rows: Array<GuiSelectedRow>): void {
    this.MemberRows = rows;
    this.SelectedMemberRows = rows.map((m: GuiSelectedRow) => m.source.id);
  }
  onSelectedRowsNewMembers(rows: Array<GuiSelectedRow>): void {
    this.NewMemberRows = rows;
    this.SelectedNewMemberRows = rows.map((m: GuiSelectedRow) => m.source.id);
  }
  add_new_members() {
    var _self = this;
    this.currentGroup["array_agg"] = [
      ...new Set(
        this.currentGroup["array_agg"].concat(this.SelectedNewMemberRows)
      ),
    ];
    this.groupMembers = [
      ...new Set(
        this.groupMembers.concat(
          this.NewMemberRows.map((m: GuiSelectedRow) => m.source)
        )
      ),
    ];
    this.NewMemberModalVisible = false;
  }
  remove_from_group(id: number) {
    var _self = this;
    this.currentGroup["array_agg"] = this.currentGroup["array_agg"].filter(
      (x: any) => x != id
    );
    this.groupMembers = this.groupMembers.filter((x: any) => x.id != id);
  }

  save_group() {
    var _self = this;
    this.data_provider.update_save_group(this.currentGroup).then((res) => {
      _self.initGridTable();
      _self.EditGroupModalVisible = false;
    });
  }

  editAddGroup(item: any, action: string) {
    var _self = this;
    if (action == "showadd") {
      this.currentGroup = { ...this.DefaultCurrentGroup };
      this.groupMembers = [];
      this.EditGroupModalVisible = true;
      return;
    }
    this.currentGroup = item;
    this.groupMembers = [];
    this.data_provider.get_devgroup_members(item.id).then((res) => {
      _self.groupMembers = res;
      _self.currentGroup = { ...item };
      // simple hack to remove null from devices list
      _self.currentGroup["array_agg"] = item["array_agg"].filter(
        (x: any) => x != null
      );
      _self.EditGroupModalVisible = true;
    });
  }

  show_new_member_form() {
    this.NewMemberModalVisible = true;
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
    _self.data_provider.get_dev_list(data).then((res) => {
      _self.availbleMembers = res.filter(
        (x: any) => !_self.currentGroup["array_agg"].includes(x.id)
      );
      _self.NewMemberModalVisible = true;
    });
  }

  logger(item: any) {
    console.dir(item);
  }
  initGridTable(): void {
    this.data_provider.get_devgroup_list().then((res) => {
      this.source = res;
      this.loading = false;
    });
  }
}
