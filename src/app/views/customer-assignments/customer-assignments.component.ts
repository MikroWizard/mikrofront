import { Component, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Table } from 'primeng/table';
import { dataProvider } from '../../providers/mikrowizard/data';

@Component({
  selector: 'app-customer-assignments',
  templateUrl: './customer-assignments.component.html',
  styleUrls: ['./customer-assignments.component.scss']
})
export class CustomerAssignmentsComponent implements OnInit {
  @ViewChild('dt') table!: Table;
  @ViewChild('dtDevices') dtDevices!: Table;

  public customers: any[] = [];
  public groupList: any[] = [];
  public groupSearch: string = '';
  public filteredGroups: any[] = [];
  public showGroupDropdown: boolean = false;
  public permList: any[] = [];
  public deviceList: any[] = [];
  public loading = false;

  // Assign modal state
  public selectedCustomer: any = null;
  public assignModalVisible = false;
  public assignForm: FormGroup;
  public assigning = false;
  public assignErrorMsg = "";
  public editingAssignmentId: number | null = null;

  // Device select modal state
  public deviceSelectModalVisible = false;
  public selectedDevices: any[] = [];

  openDeviceSelectModal() {
    this.deviceSelectModalVisible = true;
  }

  applyFilterDevices($event: any, stringVal: string) {
    this.dtDevices.filterGlobal(($event.target as HTMLInputElement).value, stringVal);
  }

  constructor(private data_provider: dataProvider) {
    this.assignForm = new FormGroup({
      assignment_type: new FormControl('group', Validators.required),
      group_id: new FormControl(null),
      device_ids: new FormControl([]),
      perm_id: new FormControl(null, Validators.required),
      allow_webfig: new FormControl(true),
      allow_log_auth: new FormControl(true),
      allow_log_acc: new FormControl(true),
      allow_log_dev: new FormControl(true)
    });
  }

  ngOnInit(): void {
    this.loadAssignments();
    this.loadGroups();
    this.loadPermissions();
    this.loadDevices();
  }

  loadAssignments() {
    this.loading = true;
    this.data_provider.adminGetCustomerAssignments().then((res: any) => {
      this.loading = false;
      const data = res.result || res;
      if (Array.isArray(data)) {
        this.customers = data;
      }
    }).catch(err => {
      this.loading = false;
    });
  }

  loadGroups() {
    this.data_provider.get_devgroup_list().then((res: any) => {
      if (Array.isArray(res)) {
        this.groupList = res;
      }
    }).catch(err => { });
  }

  loadPermissions() {
    this.data_provider.get_perms(1, 1000, "").then((res: any) => {
      const data = res.result || res;
      if (Array.isArray(data)) {
        this.permList = data.map((x: any) => {
          let permsObj: any = {};
          try {
            permsObj = JSON.parse(x.perms);
          } catch(e) {
            permsObj = x.perms || {};
          }
          
          let permsArray: string[] = [];
          if (permsObj && typeof permsObj === 'object' && !Array.isArray(permsObj)) {
            permsArray = Object.keys(permsObj).filter(key => permsObj[key] === true || permsObj[key] === 'true');
          } else if (Array.isArray(permsObj)) {
            permsArray = permsObj;
          } else if (typeof permsObj === 'string') {
            permsArray = permsObj.split(',').map(s => s.trim()).filter(s => s.length > 0);
          }
          
          return { id: x.id, name: x.name, perms: permsArray };
        });
      }
    }).catch(err => { });
  }

  loadDevices() {
    this.data_provider.get_devices("").then((res: any) => {
      const data = res.result || res;
      if (Array.isArray(data)) {
        this.deviceList = data;
      }
    }).catch(err => {});
  }

  openAssignModal(customer: any) {
    this.selectedCustomer = customer;
    this.editingAssignmentId = null;
    this.selectedDevices = [];
    this.assignForm.reset();
    this.assignForm.get('assignment_type')!.setValue('group');
    this.assignForm.get('group_id')!.setValue(null);
    this.assignForm.get('device_ids')!.setValue([]);
    this.assignForm.get('perm_id')!.setValue(null);
    this.assignForm.get('allow_webfig')!.setValue(true);
    this.assignForm.get('allow_log_auth')!.setValue(true);
    this.assignForm.get('allow_log_acc')!.setValue(true);
    this.assignForm.get('allow_log_dev')!.setValue(true);
    this.assignErrorMsg = "";
    this.assignModalVisible = true;
  }

  openEditModal(customer: any, assignment: any) {
    this.selectedCustomer = customer;
    this.editingAssignmentId = assignment.id;
    this.assignForm.reset();

    const isSpecificDevices = assignment.device_ids && assignment.device_ids.length > 0;

    if (isSpecificDevices) {
      this.assignForm.get('assignment_type')!.setValue('devices');
      this.assignForm.get('group_id')!.setValue(null);
      this.selectedDevices = this.deviceList.filter((d: any) => assignment.device_ids.includes(+d.id));
      this.assignForm.get('device_ids')!.setValue(assignment.device_ids);
    } else {
      this.assignForm.get('assignment_type')!.setValue('group');
      this.assignForm.get('group_id')!.setValue(assignment.group_id);
      this.selectedDevices = [];
      this.assignForm.get('device_ids')!.setValue([]);
    }

    this.assignForm.get('perm_id')!.setValue(assignment.perm_id);
    const perms = assignment.portal_perms || {};
    this.assignForm.get('allow_webfig')!.setValue(perms.allow_webfig !== false);
    this.assignForm.get('allow_log_auth')!.setValue(perms.allow_log_auth !== false);
    this.assignForm.get('allow_log_acc')!.setValue(perms.allow_log_acc !== false);
    this.assignForm.get('allow_log_dev')!.setValue(perms.allow_log_dev !== false);
    
    this.assignErrorMsg = "";
    this.assignModalVisible = true;
  }

  submitAssignment() {
    if (!this.assignForm.get('perm_id')!.value || !this.selectedCustomer) return;

    const type = this.assignForm.get('assignment_type')!.value;
    const payload: any = {
      customer_id: this.selectedCustomer.id,
      perm_id: +this.assignForm.get('perm_id')!.value,
      portal_perms: {
        allow_webfig: this.assignForm.get('allow_webfig')!.value === true,
        allow_log_auth: this.assignForm.get('allow_log_auth')!.value === true,
        allow_log_acc: this.assignForm.get('allow_log_acc')!.value === true,
        allow_log_dev: this.assignForm.get('allow_log_dev')!.value === true
      }
    };

    if (this.editingAssignmentId) {
      payload.id = this.editingAssignmentId;
    }

    if (type === 'group') {
      const gid = this.assignForm.get('group_id')!.value;
      if (!gid) {
        this.assignErrorMsg = "Please select a device group.";
        return;
      }
      payload.group_id = +gid;
    } else {
      if (!this.selectedDevices || this.selectedDevices.length === 0) {
        this.assignErrorMsg = "Please select at least one device.";
        return;
      }
      payload.device_ids = this.selectedDevices.map((d: any) => +d.id);
    }

    this.assigning = true;
    this.assignErrorMsg = "";

    this.data_provider.adminAssignCustomer(payload).then((res: any) => {
      this.assigning = false;
      if (res && res.status === 'success') {
        this.assignModalVisible = false;
        this.loadAssignments();
      } else {
        this.assignErrorMsg = res.err || "Failed to save assignment.";
      }
    }).catch(err => {
      this.assigning = false;
      this.assignErrorMsg = "Connection error with server.";
    });
  }

  removeAssignment(id: number) {
    this.data_provider.adminUnassignCustomer(id).then((res: any) => {
      this.loadAssignments();
    }).catch(err => { });
  }

  applyFilterGlobal($event: any, stringVal: string) {
    this.table.filterGlobal(($event.target as HTMLInputElement).value, stringVal);
  }

  filterGroupsSearch(event: any): void {
    const query = event.target.value.toLowerCase();
    this.filteredGroups = this.groupList.filter((g: any) =>
      g.id !== 1 && g.name.toLowerCase().includes(query)
    );
  }

  selectGroupSearch(group: any): void {
    this.assignForm.get('group_id')?.setValue(group.id);
    this.groupSearch = group.name;
    this.showGroupDropdown = false;
  }

  clearGroupSelection(): void {
    this.assignForm.get('group_id')?.setValue(null);
    this.groupSearch = '';
    this.filteredGroups = [];
  }

  hideGroupSearchDropdown(): void {
    setTimeout(() => this.showGroupDropdown = false, 200);
  }
}
