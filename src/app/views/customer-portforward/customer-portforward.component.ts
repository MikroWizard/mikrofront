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



  constructor(private data_provider: dataProvider) {
    this.pfForm = new FormGroup({
      name: new FormControl('', [Validators.required, Validators.pattern('^[a-zA-Z0-9_-]+$')]),
      is_dmz: new FormControl(false),
      protocol: new FormControl('tcp', Validators.required),
      dst_port: new FormControl('', [Validators.required, Validators.pattern('^([0-9]{1,5})(-[0-9]{1,5})?$')]),
      to_addresses: new FormControl('', [Validators.required, Validators.pattern('^[0-9.]+$')]),
      to_ports: new FormControl('', [Validators.required, Validators.pattern('^([0-9]{1,5})(-[0-9]{1,5})?$')]),
      source_selection: new FormControl('') // will be parsed into type & value
    });

    this.pfForm.get('is_dmz')?.valueChanges.subscribe(isDmz => {
      const p = this.pfForm.get('protocol');
      const dp = this.pfForm.get('dst_port');
      const tp = this.pfForm.get('to_ports');
      if (isDmz) {
        p?.disable();
        dp?.disable();
        tp?.disable();
      } else {
        p?.enable();
        dp?.enable();
        tp?.enable();
      }
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
    if (preset === 'dmz') {
      this.pfForm.patchValue({ name: 'DMZ-Expose', is_dmz: true });
    } else {
      this.pfForm.patchValue({ is_dmz: false });
      if (preset === 'web') {
        this.pfForm.patchValue({ name: 'Web-Server', protocol: 'tcp', dst_port: '80', to_ports: '80' });
      } else if (preset === 'web-secure') {
        this.pfForm.patchValue({ name: 'HTTPS-Server', protocol: 'tcp', dst_port: '443', to_ports: '443' });
      } else if (preset === 'ssh') {
        this.pfForm.patchValue({ name: 'SSH-Server', protocol: 'tcp', dst_port: '22', to_ports: '22' });
      } else if (preset === 'rdp') {
        this.pfForm.patchValue({ name: 'RDP-Desktop', protocol: 'tcp', dst_port: '3389', to_ports: '3389' });
      } else if (preset === 'ftp') {
        this.pfForm.patchValue({ name: 'FTP-Server', protocol: 'tcp', dst_port: '21', to_ports: '21' });
      } else if (preset === 'minecraft') {
        this.pfForm.patchValue({ name: 'Minecraft', protocol: 'tcp', dst_port: '25565', to_ports: '25565' });
      } else if (preset === 'plex') {
        this.pfForm.patchValue({ name: 'Plex-Media', protocol: 'tcp', dst_port: '32400', to_ports: '32400' });
      }
    }
  }

  openPfModal() {
    this.pfForm.reset({ protocol: 'tcp', is_dmz: false });
    this.pfErrorMsg = "";
    this.pfSuccessMsg = "";
    this.pfModalVisible = true;
  }

  submitPf() {
    if (this.pfForm.invalid || !this.selectedDeviceId) return;
    this.addingPf = true;
    this.pfErrorMsg = "";

    const raw = this.pfForm.getRawValue();
    const payload: any = {
      name: raw.name,
      protocol: raw.is_dmz ? 'all' : raw.protocol,
      dst_port: raw.is_dmz ? '' : raw.dst_port,
      to_addresses: raw.to_addresses,
      to_ports: raw.is_dmz ? '' : raw.to_ports
    };

    if (raw.source_selection) {
      try {
        const parsed = JSON.parse(raw.source_selection);
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

  movePf(ruleId: string, direction: -1 | 1, index: number) {
    if (!this.selectedDeviceId) return;
    if (index + direction < 0 || index + direction >= this.pfRules.length) return;
    
    const destRule = this.pfRules[index + direction];
    const destinationId = destRule.id;
    
    let targetRule = ruleId;
    let targetDest = destinationId;
    
    if (direction === 1) {
      targetRule = destinationId;
      targetDest = ruleId;
    }
    
    this.data_provider.customerMovePortforward(this.selectedDeviceId, targetRule, targetDest).then((res: any) => {
      if (res.status === 'success') {
        const temp = this.pfRules[index];
        this.pfRules[index] = this.pfRules[index + direction];
        this.pfRules[index + direction] = temp;
      }
    });
  }



  getJsonString(type: string, name: string): string {
    return JSON.stringify({ type, name });
  }
}
