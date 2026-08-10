import { Component, OnInit, OnDestroy, QueryList, ViewChildren, ViewChild } from "@angular/core";
import { dataProvider } from "../../providers/mikrowizard/data";
import { Router } from "@angular/router";
import { loginChecker } from "../../providers/login_checker";
import { Table } from 'primeng/table';
import { NgxSuperSelectOptions } from "ngx-super-select";
import { _getFocusedElementPierceShadowDom } from "@angular/cdk/platform";
import { AppToastComponent } from "../toast-simple/toast.component";
import { ToasterComponent } from "@coreui/angular";


@Component({
  templateUrl: "user_tasks.component.html",
  styleUrls: ["user_tasks.component.scss"]
})
export class UserTasksComponent implements OnInit {
  public uid: number = 0;
  public uname: string = '';
  public ispro: boolean = false;

  @ViewChild('dt') table!: Table;
  @ViewChild('dtNewMembers') tableNewMembers!: Table;

  @ViewChildren(ToasterComponent) viewChildren!: QueryList<ToasterComponent>;
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
  public loading: boolean = true;
  public rows: any = [];
  public SelectedTask: any = {};
  public SelectedTaskItems: any = "";

  public exportModalVisible: boolean = false;
  public exportColumns = [
    { field: 'id', label: 'ID', selected: true },
    { field: 'name', label: 'Task Name', selected: true },
    { field: 'desc_cron', label: 'Schedule (Cron)', selected: true },
    { field: 'status', label: 'Status', selected: true },
    { field: 'description', label: 'Description', selected: true },
    { field: 'last_run', label: 'Last Run', selected: false }
  ];

  openExportModal() {
    this.exportModalVisible = true;
  }
  public runConfirmModalVisible: boolean = false;
  public EditTaskModalVisible: boolean = false;
  public DeleteConfirmModalVisible: boolean = false;
  public Members: any = "";
  public Snippets: any;
  public Sequences: any = [];
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
  public predefinedCrons: any[] = [
    // High Frequency Monitoring
    { label: 'Every minute', value: '* * * * *', description: 'Critical monitoring - runs every minute' },
    { label: 'Every 2 minutes', value: '*/2 * * * *', description: 'High frequency monitoring' },
    { label: 'Every 5 minutes', value: '*/5 * * * *', description: 'Standard monitoring interval' },
    { label: 'Every 10 minutes', value: '*/10 * * * *', description: 'Regular monitoring checks' },
    { label: 'Every 15 minutes', value: '*/15 * * * *', description: 'Moderate monitoring frequency' },
    { label: 'Every 30 minutes', value: '*/30 * * * *', description: 'Low frequency monitoring' },

    // Hourly Operations
    { label: 'Every hour', value: '0 * * * *', description: 'Hourly network checks' },
    { label: 'Every 2 hours', value: '0 */2 * * *', description: 'Bi-hourly operations' },
    { label: 'Every 4 hours', value: '0 */4 * * *', description: 'Quarterly daily checks' },
    { label: 'Every 6 hours', value: '0 */6 * * *', description: 'Four times daily' },
    { label: 'Every 8 hours', value: '0 */8 * * *', description: 'Three times daily' },
    { label: 'Every 12 hours', value: '0 */12 * * *', description: 'Twice daily operations' },

    // Daily Maintenance
    { label: 'Daily at midnight', value: '0 0 * * *', description: 'Daily maintenance at 00:00' },
    { label: 'Daily at 1 AM', value: '0 1 * * *', description: 'Daily backup at 01:00' },
    { label: 'Daily at 2 AM', value: '0 2 * * *', description: 'Daily maintenance at 02:00' },
    { label: 'Daily at 3 AM', value: '0 3 * * *', description: 'Low traffic maintenance at 03:00' },
    { label: 'Daily at 6 AM', value: '0 6 * * *', description: 'Pre-business hours check' },
    { label: 'Daily at 6 PM', value: '0 18 * * *', description: 'End of business day backup' },
    { label: 'Daily at 10 PM', value: '0 22 * * *', description: 'Evening maintenance at 22:00' },

    // Business Hours
    { label: 'Workdays at 8 AM', value: '0 8 * * 1-5', description: 'Start of business day - Mon to Fri' },
    { label: 'Workdays at 9 AM', value: '0 9 * * 1-5', description: 'Business hours start check' },
    { label: 'Workdays at 12 PM', value: '0 12 * * 1-5', description: 'Midday check - Mon to Fri' },
    { label: 'Workdays at 5 PM', value: '0 17 * * 1-5', description: 'End of business day - Mon to Fri' },
    { label: 'Workdays at 6 PM', value: '0 18 * * 1-5', description: 'After hours backup - Mon to Fri' },

    // Weekly Operations
    { label: 'Weekly (Sunday midnight)', value: '0 0 * * 0', description: 'Weekly maintenance - Sunday 00:00' },
    { label: 'Weekly (Monday midnight)', value: '0 0 * * 1', description: 'Weekly start - Monday 00:00' },
    { label: 'Weekly (Friday 6 PM)', value: '0 18 * * 5', description: 'End of week backup - Friday 18:00' },
    { label: 'Weekly (Saturday 2 AM)', value: '0 2 * * 6', description: 'Weekend maintenance - Saturday 02:00' },

    // Monthly Operations
    { label: 'Monthly (1st at midnight)', value: '0 0 1 * *', description: 'Monthly maintenance - 1st of month' },
    { label: 'Monthly (1st at 2 AM)', value: '0 2 1 * *', description: 'Monthly backup - 1st at 02:00' },
    { label: 'Monthly (15th at midnight)', value: '0 0 15 * *', description: 'Mid-month maintenance - 15th' },
    { label: 'Monthly (last day)', value: '0 0 28-31 * *', description: 'End of month operations' }
  ];
  public showCronDropdown: boolean = false;
  public cronSearch: string = '';
  public selectedCronPreset: any = null;
  public filteredCrons: any[] = [];
  applyFilterGlobal($event: any, stringVal: string) {
    this.table.filterGlobal(($event.target as HTMLInputElement).value, stringVal);
  }

  applyFilterNewMembers($event: any, stringVal: string) {
    this.tableNewMembers.filterGlobal(($event.target as HTMLInputElement).value, stringVal);
  }

  options: Partial<NgxSuperSelectOptions> = {
    selectionMode: "single",
    actionsEnabled: false,
    displayExpr: "name",
    valueExpr: "id",
    placeholder: "Snippet",
    searchEnabled: true,
    enableDarkMode: false,
  };

  seqOptions: Partial<NgxSuperSelectOptions> = {
    selectionMode: "single",
    actionsEnabled: false,
    displayExpr: "name",
    valueExpr: "id",
    placeholder: "Sequence",
    searchEnabled: true,
    enableDarkMode: false,
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
      this.data_provider
        .Add_task(_self.SelectedTask, _self.SelectedTaskItems)
        .then((res) => {
          if (res && res.status === 'failed') {
            _self.show_toast("Error", res.err, "danger");
          } else {
            _self.show_toast("Success", "Task created successfully", "success");
            _self.initGridTable();
            _self.EditTaskModalVisible = false;
          }
        });
    } else {
      this.data_provider
        .Edit_task(_self.SelectedTask, _self.SelectedTaskItems)
        .then((res) => {
          if (res && res.status === 'failed') {
            _self.show_toast("Error", res.err, "danger");
          } else {
            _self.show_toast("Success", "Task updated successfully", "success");
            _self.initGridTable();
            _self.EditTaskModalVisible = false;
          }
        });
    }
  }

  onSelectedRowsNewMembers(rows: any[]): void {
    this.NewMemberRows = rows;
    this.SelectedNewMemberRows = rows;
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
        cron: "0 2 * * *",
        desc_cron: "",
        description: "",
        members: "",
        name: "",
        selection_type: "devices",
        snippetid: "",
        task_type: "backup",
      };
      this.SelectedTask['data'] = { 'strategy': 'system', 'version_to_install': '', 'version_to_install_6': '' };
      this.cronSearch = '';
      this.selectedCronPreset = null;
      this.SelectedMembers = [];
      this.SelectedTaskItems = [];
      this.EditTaskModalVisible = true;
      return;
    }

    var _self = this;
    this.SelectedTask = { ...item };

    // Initialize cron search and preset tracking
    this.cronSearch = '';
    const currentCron = this.SelectedTask['cron'];
    this.selectedCronPreset = this.predefinedCrons.find(cron => cron.value === currentCron) || null;

    if ((this.SelectedTask['task_type'] == 'firmware' || this.SelectedTask['task_type'] == 'sequence') && 'data' in this.SelectedTask && this.SelectedTask['data']) {
      if (typeof this.SelectedTask['data'] === 'string') {
        this.SelectedTask['data'] = JSON.parse(this.SelectedTask['data']);
      }
      if (this.SelectedTask['task_type'] == 'firmware' && this.SelectedTask['data']['strategy'] == 'defined') {
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
      else {
        _self.firms_loaded = true;
      }

    }
    _self.data_provider.get_snippets("", "", "", 0, 1000, false).then((res) => {
      _self.Snippets = res.map((x: any) => {
        return { id: x.id, name: x.name };
      });
    });
    if (_self.ispro) {
      _self.data_provider.get_sequences().then((res: any) => {
        _self.Sequences = res.map((x: any) => {
          return { id: x.id, name: x.name };
        });
      });
    }
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
    _self.data_provider.get_snippets(v, "", "", 0, 1000, false).then((res) => {
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
        if (res && res.status === 'failed') {
          _self.show_toast("Error", res.err, "danger");
        } else {
          _self.show_toast("Success", "Task deleted successfully", "success");
          _self.initGridTable();
        }
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

  selectCron(cron: any): void {
    this.SelectedTask['cron'] = cron.value;
    this.selectedCronPreset = cron;
    this.cronSearch = '';
    this.showCronDropdown = false;
  }

  filterCrons(event: any): void {
    const searchTerm = event.target.value.toLowerCase();
    this.cronSearch = searchTerm;
    this.selectedCronPreset = null;

    if (searchTerm.length > 0) {
      this.filteredCrons = this.predefinedCrons.filter(cron =>
        cron.label.toLowerCase().includes(searchTerm) ||
        cron.description.toLowerCase().includes(searchTerm) ||
        cron.value.includes(searchTerm)
      );
    } else {
      this.filteredCrons = this.predefinedCrons;
    }
  }

  hideCronDropdown(): void {
    setTimeout(() => {
      this.showCronDropdown = false;
    }, 200);
  }

  onCronInputFocus(): void {
    this.filteredCrons = this.predefinedCrons;
    this.showCronDropdown = true;

    // If current cron matches a preset, highlight it
    const currentCron = this.SelectedTask['cron'];
    this.selectedCronPreset = this.predefinedCrons.find(cron => cron.value === currentCron) || null;
  }

  onCronInputChange(event: any): void {
    this.SelectedTask['cron'] = event.target.value;
    this.selectedCronPreset = null;

    // Check if the entered value matches any preset
    const enteredValue = event.target.value;
    const matchingPreset = this.predefinedCrons.find(cron => cron.value === enteredValue);
    if (matchingPreset) {
      this.selectedCronPreset = matchingPreset;
    }
  }

  getCronDescription(): string {
    if (this.selectedCronPreset) {
      return this.selectedCronPreset.description;
    }

    const currentCron = this.SelectedTask['cron'];
    const matchingPreset = this.predefinedCrons.find(cron => cron.value === currentCron);
    return matchingPreset ? matchingPreset.description : 'Custom cron expression';
  }

  onTaskTypeChange(): void {
    if (this.SelectedTask['task_type'] === 'snippet') {
      this.loadSnippets();
    } else if (this.SelectedTask['task_type'] === 'sequence') {
      this.loadSequences();
    }
  }

  loadSnippets(): void {
    var _self = this;
    _self.data_provider.get_snippets("", "", "", 0, 10).then((res) => {
      _self.Snippets = res.map((x: any) => {
        return { id: x.id, name: x.name };
      });
    });
  }

  loadSequences(): void {
    var _self = this;
    _self.data_provider.get_sequences().then((res: any) => {
      _self.Sequences = res.map((x: any) => {
        return { id: x.id, name: x.name };
      });
    });
  }

  onSequenceSelected($event: any) {
    if (!this.SelectedTask['data']) this.SelectedTask['data'] = {};
    this.SelectedTask['data']['sequence_id'] = $event;
  }

  onSequencesSearchChanged(v: any) {
    // Sequences are fully loaded on open, client side filtering can be used or ignored for now
  }
}
