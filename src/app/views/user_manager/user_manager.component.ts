import { Component, OnInit, QueryList, ViewChildren, ViewChild } from "@angular/core";
import { dataProvider } from "../../providers/mikrowizard/data";
import { Router } from "@angular/router";
import { loginChecker } from "../../providers/login_checker";
import { Table } from 'primeng/table';
import { NgxSuperSelectOptions } from "ngx-super-select";
import { AppToastComponent } from "../toast-simple/toast.component";
import { ToasterComponent } from "@coreui/angular";

@Component({
  templateUrl: "user_manager.component.html",
  styleUrls: ["user_manager.scss"],
})
export class UserManagerComponent implements OnInit {
  public uid: number = 0;
  public uname: string = '';
  public ispro: boolean = false;

  @ViewChild('dt') table!: Table;
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
      _self.ispro = res.ISPRO;
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
  public loading: boolean = false;
  public rows: any = [];
  public SelectedUser: any = {};

  public exportModalVisible: boolean = false;
  public exportColumns = [
    { field: 'id', label: 'ID', selected: true },
    { field: 'username', label: 'Username', selected: true },
    { field: 'email', label: 'Email', selected: true },
    { field: 'role', label: 'Role', selected: true },
    { field: 'first_name', label: 'First Name', selected: true },
    { field: 'last_name', label: 'Last Name', selected: true },
    { field: 'status', label: 'Status', selected: true },
    { field: 'is_active', label: 'Active', selected: true },
    { field: 'last_login', label: 'Last Login', selected: false },
    { field: 'created_at', label: 'Created At', selected: false }
  ];

  openExportModal() {
    this.exportModalVisible = true;
  }
  public SelectedUserItems: string = "";
  public selectedRoleFilter: string = 'all';

  setRoleFilter(filter: string): void {
    this.selectedRoleFilter = filter;
  }

  getFilteredUsers(): Array<any> {
    if (this.selectedRoleFilter === 'all') {
      return this.source;
    } else if (this.selectedRoleFilter === 'staff') {
      return this.source.filter((u: any) => u.role !== 'customer' && u.role !== 'customer_inactive');
    } else if (this.selectedRoleFilter === 'customers') {
      return this.source.filter((u: any) => u.role === 'customer' || u.role === 'customer_inactive');
    }
    return this.source;
  }
  public EditTaskModalVisible: boolean = false;
  public DeleteConfirmModalVisible: boolean = false;
  public RestrictionsTaskModalVisible: boolean = false;
  public Members: any = "";

  public devgroup: any = {};
  public permission: any = {};
  public allDevGroups: any = [];
  public allPerms: any = [];
  public devgroupSearch: string = '';
  public permissionSearch: string = '';
  public filteredDevGroups: any = [];
  public filteredPermissions: any = [];
  public showDevGroupDropdown: boolean = false;
  public showPermissionDropdown: boolean = false;
  public DeletePermConfirmModalVisible: boolean = false;
  public EditPermModalVisible: boolean = false;
  public editingPerm: any = null;
  public newPermId: string = '';
  public EditPolicyModalVisible: boolean = false;
  public editingPolicyPerm: any = null;
  public newEditPolicyId: string = '';
  public userperms: any = {};
  public userresttrictions: any = false;
  public policyGrants: any[] = [];
  public allPolicies: any[] = [];
  public allBrands: any[] = [];
  public selectedPolicy: any = {};
  public policySearch: string = '';
  public filteredPolicies: any[] = [];
  public showPolicyDropdown: boolean = false;
  public editPolicyBrandMap: any = {};
  public ipaddress: string = "";
  public adminperms: { [index: string]: string } = {};
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

  options: Partial<NgxSuperSelectOptions> = {
    actionsEnabled: false,
    displayExpr: "name",
    valueExpr: "id",
    placeholder: "Members",
    searchEnabled: true,
    enableDarkMode: false,
  };

  setRadioValue(key: string, value: string): void {
    this.adminperms[key] = value;
  }

  filterDevGroups(event: any): void {
    const query = event.target.value.toLowerCase();
    this.filteredDevGroups = this.allDevGroups.filter((group: any) =>
      group.name.toLowerCase().includes(query)
    );
  }

  filterPermissions(event: any): void {
    const query = event.target.value.toLowerCase();
    this.filteredPermissions = this.allPerms.filter((perm: any) =>
      perm.name.toLowerCase().includes(query)
    );
  }

  selectDevGroup(group: any): void {
    this.devgroup = group;
    this.devgroupSearch = group.name;
    this.showDevGroupDropdown = false;
  }

  selectPermission(perm: any): void {
    this.permission = perm;
    this.permissionSearch = perm.name;
    this.showPermissionDropdown = false;
  }

  hideDevGroupDropdown(): void {
    setTimeout(() => this.showDevGroupDropdown = false, 200);
  }

  hidePermissionDropdown(): void {
    setTimeout(() => this.showPermissionDropdown = false, 200);
  }

  applyFilterGlobal($event: any, stringVal: string) {
    this.table.filterGlobal(($event.target as HTMLInputElement).value, stringVal);
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
  totp(item: any) {
    this.SelectedUser = item;
    this.data_provider.totp('enable', this.SelectedUser.id).then((res) => {
      if (res.status == "success") {
        this.show_toast("Success", "Totp generated successfully", "success");
      } else {
        this.show_toast("Error", res.err, "danger");
      }
    });
  }
  submit(action: string) {
    var _self = this;
    if (action == "add") {
      if (_self.SelectedUser["role"] == "admin") {
        _self.adminperms = { ..._self.defadminperms };
      }
      if (_self.userperms.length > 0) {
        _self.SelectedUser["userperms"] = _self.userperms;
      } else {
        _self.SelectedUser["userperms"] = [];
      }
      _self.SelectedUser["adminperms"] = _self.adminperms;
      this.data_provider.create_user(_self.SelectedUser).then((res) => {
        if ("error" in res && res.error.indexOf("Unauthorized")) {
          _self.show_toast(
            "Error",
            "You are not authorized to perform this action",
            "danger"
          );
        }
        else {
          if ("id" in res && !("status" in res)) {
            _self.initGridTable();
            this.EditTaskModalVisible = false;
          } else {
            //show error
            _self.show_toast("Error", res.err, "danger");
          }
        }
      });
    } else {
      if (_self.userperms.length > 0) {
        _self.SelectedUser["userperms"] = _self.userperms;
      } else {
        _self.SelectedUser["userperms"] = [];
      }
      _self.SelectedUser["adminperms"] = _self.adminperms;
      this.data_provider.edit_user(_self.SelectedUser).then((res) => {
        if ("error" in res && res.error.indexOf("Unauthorized")) {
          _self.show_toast(
            "Error",
            "You are not authorized to perform this action",
            "danger"
          );
        }
        else {
          _self.initGridTable();
          _self.EditTaskModalVisible = false;
        }
      });
    }
    //
  }

  editAddUser(item: any, action: string) {
    var _self = this;
    this.data_provider.get_perms(1, 1000, "").then((res) => {
      if ("error" in res && res.error.indexOf("Unauthorized")) {
        _self.show_toast(
          "Error",
          "You are not authorized to perform this action",
          "danger"
        );
      }
      else if ("err" in res) {
        _self.show_toast("Error", res.err, "danger");
      }
      else {
        _self.allPerms = res.map((x: any) => {
          return { id: x["id"], name: x.name };
        });
        _self.filteredPermissions = [..._self.allPerms];
        _self.data_provider.get_devgroup_list().then((res) => {
          if ("error" in res && res.error.indexOf("Unauthorized")) {
            _self.show_toast(
              "Error",
              "You are not authorized to perform this action",
              "danger"
            );
          }
          else {
            _self.allDevGroups = res.map((x: any) => {
              return { id: x["id"], name: x.name };
            });
            _self.filteredDevGroups = [..._self.allDevGroups];
          }
        });
      }
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
      this.devgroup = {};
      this.permission = {};
      this.devgroupSearch = '';
      this.permissionSearch = '';
      this.EditTaskModalVisible = true;
      return;
    }
    if (item.username == "system") {
      this.show_toast("Error", "System user cannot be edited", "danger");
      return;
    }
    this.SelectedUser = { ...item };
    if (this.SelectedUser.role && this.SelectedUser.role !== 'disabled') {
      this.SelectedUser['previous_role'] = this.SelectedUser.role;
    }
    if (this.SelectedUser["adminperms"] && this.SelectedUser["adminperms"].length > 0) {
      this.adminperms = JSON.parse(this.SelectedUser["adminperms"]);
    } else this.adminperms = { ...this.defadminperms };
    _self.SelectedUser["action"] = "edit";
    _self.get_user_perms(_self.SelectedUser["id"]);
    if (_self.ispro) {
      _self.loadPolicies();
      _self.loadPolicyGrants();
      _self.loadBrands();
    }
    _self.devgroup = {};
    _self.permission = {};
    _self.devgroupSearch = '';
    _self.permissionSearch = '';
    _self.EditTaskModalVisible = true;
  }

  checkIpAddress(ip: string) {
    const ipv4Pattern = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\.|\/|)){4}\b(0?[1-9]|1[0-9]|2[0-9]|3[0-2])\b$/;
    return ipv4Pattern.test(ip)
  }

  showrest(item: any) {
    var _self = this;
    this.SelectedUser = { ...item };

    this.data_provider.get_user_restrictions(this.SelectedUser["id"]).then((res) => {
      _self.userresttrictions = res;
      _self.RestrictionsTaskModalVisible = true;
    });
  }
  delete_ip(item: string) {

    this.userresttrictions['allowed_ips'] = this.userresttrictions['allowed_ips'].filter((x: any) => x != item);
  }

  add_ip() {
    //check if ip address is valid cidr and not added before
    let ip = this.ipaddress.trim();
    if (ip == "") return;
    if (this.userresttrictions['allowed_ips'].includes(ip)) {
      this.show_toast("Error", "IP already added", "danger");
      return;
    }
    //check if ip is valid cidr ip
    if (this.checkIpAddress(ip)) {
      this.userresttrictions['allowed_ips'].push(ip);
      this.userresttrictions['allowed_ips'] = this.userresttrictions['allowed_ips'].filter((x: any) => x != "");
      this.ipaddress = "";
    }
    else {
      this.show_toast("Error", "Invalid IP address", "danger");
    }
  }

  save_sec() {
    var _self = this;
    this.data_provider.save_user_restrictions(this.SelectedUser.id, this.userresttrictions).then((res) => {
      if ("error" in res && res.error.indexOf("Unauthorized")) {
        _self.show_toast(
          "Error",
          "You are not authorized to perform this action",
          "danger"
        );
      }
      else {
        if ('status' in res && res['status'] == 'success')
          this.RestrictionsTaskModalVisible = false;
        else if ('status' in res && res['status'] == 'failed')
          this.show_toast("Error", res.err, "danger");
        else
          this.show_toast("Error", "Somthing went wrong", "danger");
      }
    });
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
        if ("error" in res && res.error.indexOf("Unauthorized")) {
          _self.show_toast(
            "Error",
            "You are not authorized to perform this action",
            "danger"
          );
        }
        else {
          if (_self.ispro && _self.selectedPolicy && _self.selectedPolicy.id) {
            _self.data_provider.createPolicyGrant({
              user_id: _self.SelectedUser.id,
              group_id: _self.devgroup.id,
              policy_id: _self.selectedPolicy.id,
            }).then(() => _self.loadPolicyGrants());
          }
          _self.get_user_perms(_self.SelectedUser["id"]);
          _self.permission = 0;
          _self.devgroup = 0;
          _self.selectedPolicy = {};
          _self.policySearch = '';
        }
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

  // ---- Terminal Policy Grants (PRO) ----

  loadPolicies() {
    const _self = this;
    _self.data_provider.listPolicies().then((res: any) => {
      if (res.status === 'success') {
        _self.allPolicies = (res.data || []).map((p: any) => ({ id: p.id, name: p.name }));
        _self.filteredPolicies = [..._self.allPolicies];
      }
    });
  }

  loadBrands() {
    const _self = this;
    _self.data_provider.getDeviceBrands().then((res: any) => {
      if (Array.isArray(res)) {
        _self.allBrands = res.filter((b: any) => b.is_active !== false);
      } else if (res && Array.isArray(res.data)) {
        _self.allBrands = res.data.filter((b: any) => b.is_active !== false);
      }
    });
  }

  getGroupPolicy(groupId: number): any {
    return this.policyGrants.find((g: any) => g.group_id === groupId);
  }

  getGroupPolicyId(groupId: number): string {
    const grant = this.getGroupPolicy(groupId);
    return grant ? grant.policy_id : '';
  }

  getGroupPolicyName(groupId: number): string {
    const grant = this.getGroupPolicy(groupId);
    if (!grant) return '— None —';
    if (grant.brand_map && Object.keys(grant.brand_map).length > 0 && !grant.policy_id) return 'Per-brand';
    return grant.policy_name || '— None —';
  }

  getGroupPolicyBrandCoverage(groupId: number): {brand: string, policy_name: string}[] {
    const grant = this.getGroupPolicy(groupId);
    const coverage: {brand: string, policy_name: string}[] = [];
    if (grant && grant.brand_map) {
      for (const [brand, pid] of Object.entries(grant.brand_map)) {
        if (pid) {
          const p = this.allPolicies.find((p: any) => p.id === pid);
          coverage.push({ brand, policy_name: p ? p.name : '—' });
        }
      }
    }
    return coverage;
  }

  editUserPerm(perm: any): void {
    this.editingPerm = { ...perm };
    this.newPermId = String(perm.perm_id);
    this.EditPermModalVisible = true;
  }

  updateUserPerm(): void {
    if (!this.editingPerm || !this.newPermId) return;
    const _self = this;
    this.data_provider.Delete_user_perm(this.editingPerm.id).then(() => {
      _self.data_provider.Add_user_perm(
        _self.SelectedUser.id,
        +_self.newPermId,
        _self.editingPerm.group_id
      ).then(() => {
        _self.EditPermModalVisible = false;
        _self.get_user_perms(_self.SelectedUser.id);
      });
    });
  }

  editUserPolicy(perm: any): void {
    this.editingPolicyPerm = { ...perm };
    this.newEditPolicyId = this.getGroupPolicyId(perm.group_id);
    const grant = this.getGroupPolicy(perm.group_id);
    this.editPolicyBrandMap = grant && grant.brand_map ? { ...grant.brand_map } : {};
    this.EditPolicyModalVisible = true;
  }

  updateUserPolicy(): void {
    if (!this.editingPolicyPerm) return;
    const groupId = this.editingPolicyPerm.group_id;
    const brandMap = {} as any;
    let hasBrandPolicies = false;
    for (const b of this.allBrands) {
      const pid = this.editPolicyBrandMap[b.brand];
      if (pid) {
        brandMap[b.brand] = pid;
        hasBrandPolicies = true;
      }
    }
    const payload: any = {
      user_id: this.SelectedUser.id,
      group_id: groupId,
      policy_id: this.newEditPolicyId || (hasBrandPolicies ? null : ''),
    };
    if (hasBrandPolicies) {
      payload.brand_map = brandMap;
    }
    this.data_provider.createPolicyGrant(payload).then((res: any) => {
      if (res.status === 'success') {
        this.EditPolicyModalVisible = false;
        this.loadPolicyGrants();
      }
    });
  }

  setBrandPolicy(brand: string, policyId: string): void {
    if (policyId) {
      this.editPolicyBrandMap[brand] = policyId;
    } else {
      delete this.editPolicyBrandMap[brand];
    }
  }

  loadPolicyGrants() {
    const _self = this;
    _self.data_provider.listPolicyGrants({ user_id: _self.SelectedUser.id }).then((res: any) => {
      if (res.status === 'success') {
        _self.policyGrants = res.data || [];
      }
    });
  }

  filterPolicies(event: any): void {
    const query = event.target.value.toLowerCase();
    this.filteredPolicies = this.allPolicies.filter((p: any) =>
      p.name.toLowerCase().includes(query)
    );
  }

  selectPolicy(policy: any): void {
    this.selectedPolicy = policy;
    this.policySearch = policy.name;
    this.showPolicyDropdown = false;
  }

  hidePolicyDropdown(): void {
    setTimeout(() => this.showPolicyDropdown = false, 200);
  }

  confirm_delete(item: any = "", del: boolean = false) {
    if (!del) {
      this.SelectedUser = { ...item };
      this.DeleteConfirmModalVisible = true;
    } else {
      var _self = this;
      this.data_provider.delete_user(_self.SelectedUser["id"]).then((res) => {
        if ("error" in res && res.error.indexOf("Unauthorized")) {
          _self.show_toast(
            "Error",
            "You are not authorized to perform this action",
            "danger"
          );
        }
        else if ("err" in res) {
          _self.show_toast("Error", res.err, "danger");
        }
        else {
          _self.initGridTable();
          _self.DeleteConfirmModalVisible = false;
        }
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
    var _self = this;
    this.data_provider.Delete_user_perm(item.id).then((res) => {
      if ("error" in res && res.error.indexOf("Unauthorized")) {
        _self.show_toast(
          "Error",
          "You are not authorized to perform this action",
          "danger"
        );
      }
      else {
        if (_self.ispro && item.group_id) {
          _self.data_provider.deletePolicyGrant({
            user_id: _self.SelectedUser.id,
            group_id: item.group_id,
          }).then(() => _self.loadPolicyGrants());
        }
        this.get_user_perms(this.SelectedUser["id"]);
      }
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
      if ("error" in res && res.error.indexOf("Unauthorized")) {
        _self.show_toast(
          "Error",
          "You are not authorized to perform this action",
          "danger"
        );
      }
      else {
        _self.source = res.map((x: any) => {
          return x;
        });
        _self.SelectedUser = {};
        _self.loading = false;
      }
    });
  }
}
