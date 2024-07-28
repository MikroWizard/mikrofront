import { Component, OnInit, OnDestroy } from "@angular/core";
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


@Component({
  templateUrl: "user_tasks.component.html",
})
export class UserTasksComponent implements OnInit {
  public uid: number;
  public uname: string;
  public ispro: boolean = false;

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
  public source: Array<any> = [];
  public columns: Array<GuiColumn> = [];
  public loading: boolean = true;
  public rows: any = [];
  public SelectedTask: any = {};
  public SelectedTaskItems: any = "";
  public runConfirmModalVisible: boolean = false;
  public EditTaskModalVisible: boolean = false;
  public DeleteConfirmModalVisible: boolean = false;
  public Members: any = "";
  public Snippets: any;
  public SelectedMembers: any = [];
  public NewMemberModalVisible: boolean = false;
  public availbleMembers: any = [];
  public NewMemberRows: any = [];
  public SelectedNewMemberRows: any;
  public available_firmwares: any = [];
  public available_firmwaresv6: any = [];
  public firmwaretoinstall: string = "none";
  public firmwaretoinstallv6: string = "none";
  public updateBehavior: string = "keep";
  public firms_loaded: boolean = false;
  public sorting = {
    enabled: true,
    multiSorting: true,
  };
  searching: GuiSearching = {
    enabled: true,
    placeholder: "Search Devices",
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

    if (this.SelectedTask["selection_type"] == "devices")
      _self.data_provider.get_dev_list(data).then((res) => {
        _self.availbleMembers = res.filter(
          (x: any) => !_self.SelectedTaskItems.includes(x.id)
        );
        _self.NewMemberModalVisible = true;
      });
    else
      _self.data_provider.get_devgroup_list().then((res) => {
        _self.availbleMembers = res.filter(
          (x: any) => !_self.SelectedTaskItems.includes(x.id)
        );
        _self.NewMemberModalVisible = true;
      });
  }

  ngOnInit(): void {
    this.initGridTable();
  }

  submit(action: string) {
    var _self = this;
    if (action == "add") {
      this.data_provider
        .Add_task(_self.SelectedTask, _self.SelectedTaskItems)
        .then((res) => {
          _self.initGridTable();
        });
    } else {
      this.data_provider
        .Edit_task(_self.SelectedTask, _self.SelectedTaskItems)
        .then((res) => {
          _self.initGridTable();
        });
    }
    this.EditTaskModalVisible = false;
  }

  onSelectedRowsNewMembers(rows: Array<GuiSelectedRow>): void {
    this.NewMemberRows = rows;
    this.SelectedNewMemberRows = rows.map((m: GuiSelectedRow) => m.source);
  }

  add_new_members() {
    var _self = this;
    _self.SelectedMembers = [
      ...new Set(_self.SelectedMembers.concat(_self.SelectedNewMemberRows)),
    ];

    _self.SelectedTaskItems = _self.SelectedMembers.map((x: any) => {
      return x.id;
    });

    this.NewMemberModalVisible = false;
  }

  editAddTask(item: any, action: string) {
    if (action == "showadd") {
      this.SelectedTask = {
        id: 0,
        action: "add",
        taskcron: "* * * * *",
        desc_cron: "",
        description: "",
        members: "",
        name: "",
        selection_type: "devices",
        snippetid: "",
        task_type: "backup",
      };
      this.SelectedTask['data'] = { 'strategy': 'system', 'version_to_install': '', 'version_to_install_6': '' }
      this.SelectedMembers = [];
      this.SelectedTaskItems = [];
      this.EditTaskModalVisible = true;
      return;
    }

    var _self = this;
    this.SelectedTask = { ...item };
    if (this.SelectedTask['task_type'] == 'firmware' && 'data' in this.SelectedTask && this.SelectedTask['data']) {
      this.SelectedTask['data'] = JSON.parse(this.SelectedTask['data']);
      if (this.SelectedTask['data']['strategy'] == 'defined') {
        this.data_provider.get_firms(0, 10000, false).then((res) => {
          let index = 1;
          _self.available_firmwares = [
            ...new Set(
              res["firms"].map((x: any) => {
                return x.version;
              })
            ),
          ];
          _self.available_firmwaresv6 = [
            ...new Set(
              res["firms"].map((x: any) => {
                return x.version;
              })
            ),
          ].filter((x: any) => x.match(/^6\./g));
          _self.updateBehavior = res.updateBehavior;
          _self.firms_loaded = true;
        });
      }
      else{
        _self.firms_loaded = true;
      }

    }
    _self.data_provider.get_snippets("", "", "", 0, 1000).then((res) => {
      _self.Snippets = res.map((x: any) => {
        return { id: x.id, name: x.name };
      });
    });
    if (action != "select_change") {
      this.SelectedTask["action"] = "edit";
      this.data_provider.get_task_members(_self.SelectedTask.id).then((res) => {
        _self.SelectedMembers = res;
        _self.EditTaskModalVisible = true;
        _self.SelectedTaskItems = res.map((x: any) => {
          return x.id;
        });
      });
    } else {
      _self.SelectedMembers = [];
      this.SelectedTaskItems = [];
    }
  }


  
  firmware_type_changed(type: any) {
    this.SelectedTask['data']['strategy'] = type;
    if (type == 'system') {
      this.SelectedTask['data']['version_to_install'] = false
      this.SelectedTask['data']['version_to_install_6'] = false
    }
    else if (type == 'defined') {
      var _self = this;
      this.data_provider.get_firms(0, 10000, false).then((res) => {
        let index = 1;
        _self.available_firmwares = [
          ...new Set(
            res["firms"].map((x: any) => {
              return x.version;
            })
          ),
        ];
        _self.available_firmwaresv6 = [
          ...new Set(
            res["firms"].map((x: any) => {
              return x.version;
            })
          ),
        ].filter((x: any) => x.match(/^6\./g));
        _self.updateBehavior = res.updateBehavior;
        _self.firms_loaded = true;
      });
    }
    else if (type == 'latest') {
      this.SelectedTask['data']['version_to_install'] = false
      this.SelectedTask['data']['version_to_install_6'] = false
      //get firmwares to select
    }
    return
  }
  remove_member(item: any) {
    var _self = this;
    _self.SelectedMembers = _self.SelectedMembers.filter(
      (x: any) => x.id != item.id
    );
    _self.SelectedTaskItems = _self.SelectedMembers.map((x: any) => {
      return x.id;
    });
  }
  onSelectValueChanged($event: any) {
    this.SelectedTask["snippetid"] = $event;
  }
  onSnippetsValueChanged(v: any) {
    var _self = this;
    if (v == "" || v.length < 3) return;
    _self.data_provider.get_snippets(v, "", "", 0, 1000).then((res) => {
      _self.Snippets = res.map((x: any) => {
        return { id: String(x.id), name: x.name };
      });
    });
  }

  get_member_by_id(id: string) {
    return this.Members.find((x: any) => x.id == id);
  }

  confirm_delete(item: any = "", del: boolean = false) {
    if (!del) {
      this.SelectedTask = { ...item };
      this.DeleteConfirmModalVisible = true;
    } else {
      var _self = this;
      this.data_provider.Delete_task(_self.SelectedTask["id"]).then((res) => {
        _self.initGridTable();
        _self.DeleteConfirmModalVisible = false;
      });
    }
  }

  form_changed() {
    this.editAddTask(this.SelectedTask, "select_change");
  }

  confirm_run(item: any) {
    this.SelectedTask = { ...item };
    this.DeleteConfirmModalVisible = true;
  }
  runTask() {
    console.dir(this.SelectedTask);
  }
  logger(item: any) {
    console.dir(item);
  }

  initGridTable(): void {
    var _self = this;
    this.data_provider.get_user_task_list().then((res) => {
      _self.source = res.map((x: any) => {
        return x;
      });
      _self.loading = false;
    });
  }
}
