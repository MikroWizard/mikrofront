import { Component, OnInit, ViewChild } from "@angular/core";
import { dataProvider } from "../../providers/mikrowizard/data";
import { Router } from "@angular/router";
import { loginChecker } from "../../providers/login_checker";
import { formatInTimeZone } from "date-fns-tz";
import { Table } from 'primeng/table';

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
  styleUrls: ["devgroup.component.scss"]
})
export class DevicesGroupComponent implements OnInit {
  public uid: number = 0;
  public uname: string = '';
  public tz: string = '';

  @ViewChild('dt') table!: Table;
  @ViewChild('dtMembers') tableMembers!: Table;
  @ViewChild('dtNewMembers') tableNewMembers!: Table;

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
  public selectedGroup: any = null;
  public UserManagementModalVisible: boolean = false;
  public EditPermissionModalVisible: boolean = false;
  public RemovePermissionModalVisible: boolean = false;
  public availableUsers: any[] = [];
  public availablePermissions: any[] = [];
  public selectedUserId: string = "";
  public selectedPermId: string = "";
  public selectedUser: any = null;
  public selectedPermission: any = null;
  public userSearch: string = '';
  public permissionSearch: string = '';
  public filteredUsers: any[] = [];
  public filteredPermissions: any[] = [];
  public showUserDropdown: boolean = false;
  public showPermissionDropdown: boolean = false;
  public editingUser: any = null;
  public removingUser: any = null;
  public newPermissionId: string = "";
  private deviceCache: { [key: number]: any[] } = {};
  private loadingDevices: { [key: number]: boolean } = {};
  public FirmwareConfirmModalVisible: boolean = false;
  public firmwareAction: string = "";
  public selectedGroupForFirmware: any = null;
  public DefaultCurrentGroup: any = {
    array_agg: [],
    created: "",
    id: 0,
    name: "",
  };
  applyFilterGlobal($event: any, stringVal: string) {
    this.table.filterGlobal(($event.target as HTMLInputElement).value, stringVal);
  }

  applyFilterMembers($event: any, stringVal: string) {
    this.tableMembers.filterGlobal(($event.target as HTMLInputElement).value, stringVal);
  }

  applyFilterNewMembers($event: any, stringVal: string) {
    this.tableNewMembers.filterGlobal(($event.target as HTMLInputElement).value, stringVal);
  }

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

  onSelectedRowsMembers(rows: any[]): void {
    this.MemberRows = rows;
    this.SelectedMemberRows = rows.map((m: any) => m.id);
  }
  onSelectedRowsNewMembers(rows: any[]): void {
    this.NewMemberRows = rows;
    this.SelectedNewMemberRows = rows.map((m: any) => m.id);
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
          this.NewMemberRows
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
      // Clear device cache for this group
      delete this.deviceCache[this.currentGroup.id];
      delete this.loadingDevices[this.currentGroup.id];
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

  manageUsers(group: any): void {
    this.selectedGroup = { ...group };
    this.loadAvailableUsers();
    this.loadAvailablePermissions();
    this.UserManagementModalVisible = true;
  }

  loadAvailableUsers(): void {
    this.data_provider.get_users(1, 1000, "").then((res) => {
      this.availableUsers = res.filter((user: any) => 
        !this.selectedGroup.assigned_users.some((assignedUser: any) => assignedUser.user_id === user.id)
      );
      this.filteredUsers = [...this.availableUsers];
    });
  }

  loadAvailablePermissions(): void {
    this.data_provider.get_perms(1, 1000, "").then((res) => {
      this.availablePermissions = res;
      this.filteredPermissions = [...this.availablePermissions];
    });
  }

  filterUsers(event: any): void {
    const query = event.target.value.toLowerCase();
    this.filteredUsers = this.availableUsers.filter((user: any) => 
      user.username.toLowerCase().includes(query) || 
      (user.first_name + ' ' + user.last_name).toLowerCase().includes(query)
    );
  }

  filterPermissions(event: any): void {
    const query = event.target.value.toLowerCase();
    this.filteredPermissions = this.availablePermissions.filter((perm: any) => 
      perm.name.toLowerCase().includes(query)
    );
  }

  selectUser(user: any): void {
    this.selectedUser = user;
    this.selectedUserId = user.id;
    this.userSearch = user.username + ' (' + user.first_name + ' ' + user.last_name + ')';
    this.showUserDropdown = false;
  }

  selectPermission(perm: any): void {
    this.selectedPermission = perm;
    this.selectedPermId = perm.id;
    this.permissionSearch = perm.name;
    this.showPermissionDropdown = false;
  }

  hideUserDropdown(): void {
    setTimeout(() => this.showUserDropdown = false, 200);
  }

  hidePermissionDropdown(): void {
    setTimeout(() => this.showPermissionDropdown = false, 200);
  }

  addUserPermission(): void {
    if (!this.selectedUser || !this.selectedPermission) return;
    
    console.log('Adding user permission:', {
      userId: this.selectedUser.id,
      permissionId: this.selectedPermission.id,
      groupId: this.selectedGroup.id,
      selectedUser: this.selectedUser,
      selectedPermission: this.selectedPermission
    });
    
    this.data_provider.Add_user_perm(this.selectedUser.id, +this.selectedPermission.id, this.selectedGroup.id)
      .then((res) => {
        console.log('Add user permission response:', res);
        this.initGridTable();
        this.selectedUserId = "";
        this.selectedPermId = "";
        this.selectedUser = null;
        this.selectedPermission = null;
        this.userSearch = "";
        this.permissionSearch = "";
        // Refresh the selected group data
        this.data_provider.get_devgroup_list().then((groups) => {
          this.selectedGroup = groups.find((g: any) => g.id === this.selectedGroup.id);
          this.loadAvailableUsers();
        });
      });
  }

  editUserPermission(user: any): void {
    this.editingUser = { ...user };
    this.newPermissionId = user.perm_id.toString();
    this.EditPermissionModalVisible = true;
  }

  updateUserPermission(): void {
    if (!this.newPermissionId) return;
    
    // Remove old permission and add new one
    this.data_provider.Delete_user_perm(this.editingUser.id).then(() => {
      this.data_provider.Add_user_perm(this.editingUser.user_id, +this.newPermissionId, this.selectedGroup.id)
        .then(() => {
          this.EditPermissionModalVisible = false;
          this.initGridTable();
          // Refresh the selected group data
          this.data_provider.get_devgroup_list().then((groups) => {
            this.selectedGroup = groups.find((g: any) => g.id === this.selectedGroup.id);
          });
        });
    });
  }

  removeUserPermission(user: any): void {
    this.removingUser = { ...user };
    this.RemovePermissionModalVisible = true;
  }

  confirmRemovePermission(): void {
    this.data_provider.Delete_user_perm(this.removingUser.id).then(() => {
      this.RemovePermissionModalVisible = false;
      this.initGridTable();
      // Refresh the selected group data
      this.data_provider.get_devgroup_list().then((groups) => {
        this.selectedGroup = groups.find((g: any) => g.id === this.selectedGroup.id);
        this.loadAvailableUsers();
      });
    });
  }

  getPermissionColor(permName: string): string {
    const colorMap: { [key: string]: string } = {
      'full': 'success',
      'read': 'info',
      'write': 'warning',
      'admin': 'danger',
      'test': 'secondary'
    };
    return colorMap[permName] || 'primary';
  }

  getUsersTooltip(users: any[]): string {
    if (users.length === 0) return 'No users assigned';
    
    const maxShow = 10;
    const userList = users.slice(0, maxShow).map((user, index) => 
      `• ${user.username} (${user.perm_name})`
    ).join('\n');
    
    return users.length > maxShow 
      ? `${userList}\n━━━━━━━━━━━━━━━━\n+${users.length - maxShow} more users`
      : userList;
  }

  getDevicesTooltip(group: any): string {
    if (group.id === 1) return 'All devices in the system';
    if (!group.array_agg || group.array_agg[0] === null) return 'No devices assigned';
    
    // Check if data is cached
    if (this.deviceCache[group.id]) {
      const devices = this.deviceCache[group.id];
      const maxShow = 10;
      const deviceList = devices.slice(0, maxShow).map(device => 
        `• ${device.name} (${device.ip})`
      ).join('\n');
      
      return devices.length > maxShow 
        ? `${deviceList}\n━━━━━━━━━━━━━━━━\n+${devices.length - maxShow} more devices`
        : deviceList;
    }
    
    // Check if already loading
    if (this.loadingDevices[group.id]) {
      return 'Loading devices...';
    }
    
    // Start loading
    this.loadingDevices[group.id] = true;
    this.data_provider.get_devgroup_members(group.id).then((devices) => {
      this.deviceCache[group.id] = devices;
      this.loadingDevices[group.id] = false;
    }).catch(() => {
      this.loadingDevices[group.id] = false;
    });
    
    return 'Loading devices...';
  }

  formatCreateTime(dateString: string): string {
    if (!dateString || !this.tz) return dateString;
    return formatInTimeZone(
      dateString.split(".")[0] + ".000Z",
      this.tz,
      "yyyy-MM-dd HH:mm:ss XXX"
    );
  }

  groupFirmwareAction(group: any, action: string): void {
    this.selectedGroupForFirmware = group;
    this.firmwareAction = action;
    this.FirmwareConfirmModalVisible = true;
  }

  confirmGroupFirmwareAction(): void {
    if (!this.selectedGroupForFirmware) return;
    
    this.data_provider.group_firmware_action(this.selectedGroupForFirmware.id, this.firmwareAction)
      .then((res) => {
        if ("error" in res) {
          console.error('Firmware action failed:', res.error);
        } else {
          const actionText = this.firmwareAction === 'update' ? 'Update' : 'Upgrade';
          console.log(`${actionText} firmware initiated for group: ${this.selectedGroupForFirmware.name}`);
        }
        this.FirmwareConfirmModalVisible = false;
      })
      .catch((error) => {
        console.error('Firmware action error:', error);
        this.FirmwareConfirmModalVisible = false;
      });
  }
}
