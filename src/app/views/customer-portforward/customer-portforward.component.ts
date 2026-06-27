import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { dataProvider } from '../../providers/mikrowizard/data';

@Component({
  selector: 'app-customer-portforward',
  templateUrl: './customer-portforward.component.html',
  styleUrls: ['./customer-portforward.component.scss']
})
export class CustomerPortForwardComponent implements OnInit, OnDestroy {
  public selectedDeviceId: number | null = null;
  private deviceChangeSub: any;

  public activeTab: 'portforward' | 'addresslist' = 'portforward';

  // Port Forwarding state
  public pfRules: any[] = [];
  public loadingPf = false;
  public pfForm: FormGroup;
  public pfErrorMsg = "";
  public pfSuccessMsg = "";
  public addingPf = false;
  public pfModalVisible = false;

  // Interface Sources
  public interfaceSources: {
    interfaces: any[];
    interfaceLists: any[];
    addressLists: any[];
  } = { interfaces: [], interfaceLists: [], addressLists: [] };
  public loadingSources = false;

  // Address List state
  public alEntries: any[] = [];
  public loadingAl = false;
  public alForm: FormGroup;
  public alErrorMsg = "";
  public alSuccessMsg = "";
  public addingAl = false;
  public alModalVisible = false;

  constructor(private data_provider: dataProvider) {
    this.pfForm = new FormGroup({
      name: new FormControl('', [Validators.required, Validators.pattern('^[a-zA-Z0-9_-]+$')]),
      protocol: new FormControl('tcp', Validators.required),
      dst_port: new FormControl('', [Validators.required, Validators.min(1), Validators.max(65535)]),
      to_addresses: new FormControl('', [Validators.required, Validators.pattern('^[0-9.]+$')]),
      to_ports: new FormControl('', [Validators.required, Validators.min(1), Validators.max(65535)]),
      source_selection: new FormControl('') // will be parsed into type & value
    });

    this.alForm = new FormGroup({
      list: new FormControl('', Validators.required),
      address: new FormControl('', Validators.required)
    });
  }

  ngOnInit(): void {
    const cached = localStorage.getItem('customer_selected_device_id');
    if (cached) {
      this.selectedDeviceId = +cached;
      this.loadData();
    }

    this.deviceChangeSub = (event: Event) => {
      const customEvent = event as CustomEvent;
      this.selectedDeviceId = customEvent.detail;
      this.loadData();
    };
    window.addEventListener('customerDeviceChanged', this.deviceChangeSub);
  }

  ngOnDestroy(): void {
    if (this.deviceChangeSub) {
      window.removeEventListener('customerDeviceChanged', this.deviceChangeSub);
    }
  }

  loadData() {
    if (!this.selectedDeviceId) return;
    this.loadPfRules();
    this.loadAddressLists();
    this.loadInterfaceSources();
  }

  loadPfRules() {
    if (!this.selectedDeviceId) return;
    this.loadingPf = true;
    this.data_provider.customerGetPortforwards(this.selectedDeviceId).then((res: any) => {
      this.loadingPf = false;
      const data = res.result || res;
      if (Array.isArray(data)) {
        this.pfRules = data;
      }
    }).catch(err => {
      this.loadingPf = false;
    });
  }

  loadAddressLists() {
    if (!this.selectedDeviceId) return;
    this.loadingAl = true;
    this.data_provider.customerGetAddressLists(this.selectedDeviceId).then((res: any) => {
      this.loadingAl = false;
      const data = res.result || res;
      if (Array.isArray(data)) {
        this.alEntries = data;
      }
    }).catch(err => {
      this.loadingAl = false;
    });
  }

  loadInterfaceSources() {
    if (!this.selectedDeviceId) return;
    this.loadingSources = true;
    this.data_provider.customerGetInterfaceSources(this.selectedDeviceId).then((res: any) => {
      this.loadingSources = false;
      const data = res.result || res;
      if (data && data.status === 'success') {
        this.interfaceSources = {
          interfaces: data.interfaces || [],
          interfaceLists: data.interface_lists || [],
          addressLists: data.address_lists || []
        };
      }
    }).catch(err => {
      this.loadingSources = false;
    });
  }

  // Preset configuration helpers
  applyPreset(preset: string) {
    if (preset === 'web') {
      this.pfForm.patchValue({
        name: 'Web-Server',
        protocol: 'tcp',
        dst_port: '80',
        to_ports: '80'
      });
    } else if (preset === 'ssh') {
      this.pfForm.patchValue({
        name: 'SSH-Server',
        protocol: 'tcp',
        dst_port: '22',
        to_ports: '22'
      });
    } else if (preset === 'rdp') {
      this.pfForm.patchValue({
        name: 'RDP-Desktop',
        protocol: 'tcp',
        dst_port: '3389',
        to_ports: '3389'
      });
    }
  }

  openPfModal() {
    this.pfForm.reset({ protocol: 'tcp' });
    this.pfErrorMsg = "";
    this.pfSuccessMsg = "";
    this.pfModalVisible = true;
  }

  submitPf() {
    if (this.pfForm.invalid || !this.selectedDeviceId) return;
    this.addingPf = true;
    this.pfErrorMsg = "";

    const val = this.pfForm.value;
    const payload: any = {
      name: val.name,
      protocol: val.protocol,
      dst_port: val.dst_port,
      to_addresses: val.to_addresses,
      to_ports: val.to_ports
    };

    if (val.source_selection) {
      try {
        const parsed = JSON.parse(val.source_selection);
        payload.source_type = parsed.type;
        payload.source_value = parsed.name;
      } catch (e) {
        // Fallback
      }
    }

    this.data_provider.customerAddPortforward(this.selectedDeviceId, payload).then((res: any) => {
      this.addingPf = false;
      const data = res.result || res;
      if (data && data.status === 'success') {
        this.pfModalVisible = false;
        this.loadPfRules();
      } else {
        this.pfErrorMsg = data.err || "Failed to add port forwarding rule.";
      }
    }).catch(err => {
      this.addingPf = false;
      this.pfErrorMsg = "Connection error.";
    });
  }

  togglePf(rule: any) {
    if (!this.selectedDeviceId) return;
    const targetState = !rule.disabled;
    this.data_provider.customerTogglePortforward(this.selectedDeviceId, rule.id, targetState).then((res: any) => {
      const data = res.result || res;
      if (data && data.status === 'success') {
        rule.disabled = targetState;
      } else {
        alert(data.err || "Failed to toggle rule state.");
      }
    }).catch(err => {
      alert("Connection error.");
    });
  }

  deletePf(rule: any) {
    if (!this.selectedDeviceId) return;
    if (!confirm(`Are you sure you want to delete the port forward rule "${rule.name}"?`)) return;

    this.data_provider.customerDeletePortforward(this.selectedDeviceId, rule.id).then((res: any) => {
      const data = res.result || res;
      if (data && data.status === 'success') {
        this.loadPfRules();
      } else {
        alert(data.err || "Failed to delete rule.");
      }
    }).catch(err => {
      alert("Connection error.");
    });
  }

  // Address List CRUD
  openAlModal() {
    this.alForm.reset();
    this.alErrorMsg = "";
    this.alSuccessMsg = "";
    this.alModalVisible = true;
  }

  submitAl() {
    if (this.alForm.invalid || !this.selectedDeviceId) return;
    this.addingAl = true;
    this.alErrorMsg = "";

    const payload = this.alForm.value;

    this.data_provider.customerAddAddressList(this.selectedDeviceId, payload).then((res: any) => {
      this.addingAl = false;
      const data = res.result || res;
      if (data && data.status === 'success') {
        this.alModalVisible = false;
        this.loadAddressLists();
        this.loadInterfaceSources(); // reload list suggestion names
      } else {
        this.alErrorMsg = data.err || "Failed to add address list entry.";
      }
    }).catch(err => {
      this.addingAl = false;
      this.alErrorMsg = "Connection error.";
    });
  }

  toggleAl(entry: any) {
    if (!this.selectedDeviceId) return;
    const targetState = !entry.disabled;
    this.data_provider.customerToggleAddressList(this.selectedDeviceId, entry.id, targetState).then((res: any) => {
      const data = res.result || res;
      if (data && data.status === 'success') {
        entry.disabled = targetState;
      } else {
        alert(data.err || "Failed to toggle address list entry.");
      }
    }).catch(err => {
      alert("Connection error.");
    });
  }

  deleteAl(entry: any) {
    if (!this.selectedDeviceId) return;
    if (!confirm(`Are you sure you want to remove "${entry.address}" from "${entry.list}"?`)) return;

    this.data_provider.customerDeleteAddressList(this.selectedDeviceId, entry.id).then((res: any) => {
      const data = res.result || res;
      if (data && data.status === 'success') {
        this.loadAddressLists();
        this.loadInterfaceSources(); // reload list suggestion names
      } else {
        alert(data.err || "Failed to delete entry.");
      }
    }).catch(err => {
      alert("Connection error.");
    });
  }

  getJsonString(type: string, name: string): string {
    return JSON.stringify({ type, name });
  }
}
