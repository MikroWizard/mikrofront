import { Component, Input, OnInit, OnChanges, SimpleChanges, ViewChild, QueryList, ViewChildren, Output, EventEmitter } from '@angular/core';
import { dataProvider } from '../../../providers/mikrowizard/data';
import { Router } from '@angular/router';
import { formatInTimeZone } from 'date-fns-tz';
import { Table } from 'primeng/table';
import { ToasterComponent } from '@coreui/angular';
import { AppToastComponent } from '../../toast-simple/toast.component';

@Component({
  selector: 'app-non-mikrotik-devices',
  templateUrl: './non-mikrotik.component.html',
  styleUrls: ['./non-mikrotik.component.scss']
})
export class NonMikrotikComponent implements OnInit, OnChanges {
  @Input() devices: any[] = [];
  @Input() ispro: boolean = false;
  @Input() tz: string = '';
  @Input() groups: any[] = [];
  @Output() actionEvent = new EventEmitter<{type: string, item: any}>();

  public filteredDevices: any[] = [];
  public templates: any[] = [];
  public brands: any[] = [];
  public loading: boolean = false;

  public editModalVisible: boolean = false;
  public addModalVisible: boolean = false;
  public editData: any = {};
  public addData: any = {
    name: '', ip: '', device_type: 'generic', device_model: '',
    username: '', password: '', enable_password: '', template_id: null,
    protocol: 'ssh', port: 22, group_ids: [], ssh_auth_mode: 'credential'
  };
  public brandTemplates: any[] = [];
  public credentials: any[] = [];

  @ViewChild('dtNonMikrotik') dtNonMikrotik!: Table;
  @ViewChildren(ToasterComponent) viewChildren!: QueryList<ToasterComponent>;

  public addGroupSearch: string = '';
  public filteredAddGroups: any[] = [];
  public showAddGroupDropdown: boolean = false;
  public editGroupSearch: string = '';
  public filteredEditGroups: any[] = [];
  public showEditGroupDropdown: boolean = false;

  public toasterForm = {
    autohide: true, delay: 3000, position: 'fixed', fade: true, closeButton: true
  };

  constructor(
    private data_provider: dataProvider,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.filteredDevices = (this.devices || []).filter((d: any) => d.device_type !== 'mikrotik');
    this.loadBrands();
    this.loadTemplates();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['devices']) {
      this.filteredDevices = (this.devices || []).filter((d: any) => d.device_type !== 'mikrotik');
    }
  }

  show_toast(title: string, body: string, color: string) {
    const props = { ...this.toasterForm, color, title, body };
    const ref = this.viewChildren.first.addToast(AppToastComponent, props, {});
    ref.instance['closeButton'] = props.closeButton;
  }

  loadBrands() {
    this.data_provider.listBrands().then((res: any) => {
      this.brands = Array.isArray(res) ? res : (res.data || []);
    });
  }

  loadTemplates() {
    this.data_provider.listTemplates({}).then((res: any) => {
      this.templates = (res.data || res || []);
    });
  }

  onBrandChange() {
    if (this.editData.device_type) {
      this.data_provider.listTemplates({ brand_id: this.editData.device_type }).then((res: any) => {
        this.brandTemplates = (res.data || res || []);
        if (this.brandTemplates.length && !this.editData.template_id) {
          this.editData.template_id = this.brandTemplates[0].id;
        }
      });
    } else {
      this.brandTemplates = [];
    }
  }

  onBrandChangeAdd() {
    if (this.addData.device_type) {
      this.data_provider.listTemplates({ brand_id: this.addData.device_type }).then((res: any) => {
        this.brandTemplates = (res.data || res || []);
        if (this.brandTemplates.length && !this.addData.template_id) {
          this.addData.template_id = this.brandTemplates[0].id;
        }
      });
    } else {
      this.brandTemplates = [];
    }
  }

  show_pass: boolean = false;

  openEditModal(dev: any) {
    this.editData = { ...dev };
    this.editData.password = '';
    this.editData.enable_password = '';
    this.editGroupSearch = '';
    this.filteredEditGroups = [];
    this.showEditGroupDropdown = false;
    
    Promise.all([
      this.data_provider.getNonMikrotikInfo(dev.id),
      this.data_provider.listTemplates({ brand_id: dev.device_type || '' })
    ]).then(([infoRes, templatesRes]: any) => {
      if (infoRes.status === 'success') {
        const d = infoRes.data || infoRes;
        this.editData = { ...this.editData, ...d };
      }
      this.brandTemplates = (templatesRes.data || templatesRes || []);
      if (this.brandTemplates.length && !this.editData.template_id) {
        this.editData.template_id = this.brandTemplates[0].id;
      }
      this.editData.protocol = this.editData.protocol || 'ssh';
      this.editData.port = this.editData.port || (this.editData.protocol === 'telnet' ? 23 : 22);
      this.loadCredentials(dev.id);
      this.editModalVisible = true;
    });
  }
  
  get_device_pass() {
    this.data_provider.get_device_pass(this.editData.id).then((res: any) => {
      // The backend returns {"result": {"password": "..."}} or {"result": "failed", "err": "..."}
      // sometimes wrapped in an outer result or just directly.
      const resultObj = res.result ? (res.result.result ? res.result : res) : res;
      
      if (resultObj.result && resultObj.result.password) {
        this.editData.password = resultObj.result.password;
        this.show_pass = true;
      } else if (resultObj.password) {
        this.editData.password = resultObj.password;
        this.show_pass = true;
      } else if (res.status === 'success') {
        this.editData.password = res.password || (res.result ? res.result.password : '');
        this.show_pass = true;
      } else {
        this.show_toast('Error', res.error || (res.result && res.result.err) || 'Failed to reveal password', 'danger');
      }
    });
  }


  loadCredentials(devId: number) {
    this.data_provider.listCredentials({ device_id: devId }).then((res: any) => {
      this.credentials = res.data || res || [];
    });
  }

  saveEdit() {
    this.data_provider.editNonMikrotikDevice(this.editData).then((res: any) => {
      if (res.status === 'success') {
        this.show_toast('Success', 'Device updated', 'success');
        this.editModalVisible = false;
        this.refresh();
      } else {
        this.show_toast('Error', res.error || 'Failed to update', 'danger');
      }
    });
  }

  deleteDevice(devId: number) {
    if (!confirm('Delete this device? This action cannot be undone.')) return;
    this.data_provider.deleteNonMikrotikDevice({ id: devId }).then((res: any) => {
      if (res.status === 'success') {
        this.show_toast('Success', 'Device deleted', 'success');
        this.refresh();
      } else {
        this.show_toast('Error', res.error || 'Failed to delete', 'danger');
      }
    });
  }

  addDevice() {
    this.data_provider.addNonMikrotikDevice(this.addData).then((res: any) => {
      if (res.status === 'success') {
        this.show_toast('Success', 'Device added', 'success');
        this.addModalVisible = false;
        this.addData = { name: '', ip: '', device_type: 'generic', device_model: '',
          template_id: null, username: '', password: '', enable_password: '',
          protocol: 'ssh', port: 22, group_ids: [], ssh_auth_mode: 'credential'
        };
        this.refresh();
      } else {
        this.show_toast('Error', res.error || 'Failed to add', 'danger');
      }
    });
  }

  getAgentModeDisplay(data: any): string {
    if (!data['agent_modes']) return 'default';
    const m = data['agent_modes'];
    if (m.linux === 'none' && m.darwin === 'none' && m.freebsd === 'none') return 'none';
    if (m.linux === 'strict' && m.darwin === 'strict' && m.freebsd === 'strict') return 'strict';
    if (m.linux === 'strict' && m.darwin === 'compatible' && m.freebsd === 'compatible') return 'strict_compat';
    return 'default';
  }

  setAgentModeOverride(val: string, data: any) {
    let modes = null;
    if (val === 'none') {
      modes = { linux: 'none', darwin: 'none', freebsd: 'none' };
    } else if (val === 'strict') {
      modes = { linux: 'strict', darwin: 'strict', freebsd: 'strict' };
    } else if (val === 'strict_compat') {
      modes = { linux: 'strict', darwin: 'compatible', freebsd: 'compatible' };
    }

    data['agent_modes'] = modes;
  }

  onProtocolChange() {
    const defaults: Record<string, number> = { ssh: 22, telnet: 23, web: 80 };
    this.editData.port = defaults[this.editData.protocol] || this.editData.port;
  }

  openAddModal() {
    this.addGroupSearch = '';
    this.filteredAddGroups = [];
    this.showAddGroupDropdown = false;
    this.addModalVisible = true;
  }

  connectDevice(dev: any) {
    this.router.navigate(['/connection-manager', dev.id]);
  }

  emitAction(type: string, item: any) {
    this.actionEvent.emit({type, item});
  }

  refresh() {
    this.data_provider.get_dev_list({}).then((res: any) => {
      const list = res.result || res || [];
      this.devices = list;
      this.filteredDevices = list.filter((d: any) => d.device_type !== 'mikrotik');
    });
  }


  applyFilter($event: any, mode: string) {
    this.dtNonMikrotik.filterGlobal(($event.target as HTMLInputElement).value, mode);
  }

  filterAddGroups(event: any): void {
    const query = event.target.value.toLowerCase();
    this.filteredAddGroups = this.groups.filter((g: any) =>
      g.name.toLowerCase().includes(query)
    );
  }

  selectAddGroup(group: any): void {
    if (!this.addData.group_ids) this.addData.group_ids = [];
    if (!this.addData.group_ids.includes(group.id)) {
      this.addData.group_ids = [...this.addData.group_ids, group.id];
    }
    this.addGroupSearch = '';
    this.filteredAddGroups = [];
  }

  removeAddGroup(groupId: number): void {
    this.addData.group_ids = this.addData.group_ids.filter((id: number) => id !== groupId);
  }

  filterEditGroups(event: any): void {
    const query = event.target.value.toLowerCase();
    this.filteredEditGroups = this.groups.filter((g: any) =>
      g.name.toLowerCase().includes(query)
    );
  }

  selectEditGroup(group: any): void {
    if (!this.editData.group_ids) this.editData.group_ids = [];
    if (!this.editData.group_ids.includes(group.id)) {
      this.editData.group_ids = [...this.editData.group_ids, group.id];
    }
    this.editGroupSearch = '';
    this.filteredEditGroups = [];
  }

  removeEditGroup(groupId: number): void {
    this.editData.group_ids = this.editData.group_ids.filter((id: number) => id !== groupId);
  }

  hideAddGroupDropdown(): void {
    setTimeout(() => this.showAddGroupDropdown = false, 200);
  }

  hideEditGroupDropdown(): void {
    setTimeout(() => this.showEditGroupDropdown = false, 200);
  }

  getGroupName(groupId: number): string {
    const g = this.groups.find((g: any) => g.id == groupId);
    return g ? g.name : 'Unknown';
  }
}