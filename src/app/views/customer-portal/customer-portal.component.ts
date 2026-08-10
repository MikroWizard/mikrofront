import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { dataProvider } from '../../providers/mikrowizard/data';
import { Router } from '@angular/router';

@Component({
  selector: 'app-customer-portal',
  templateUrl: './customer-portal.component.html',
  styleUrls: ['./customer-portal.component.scss']
})
export class CustomerPortalComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('chatScrollContainer') private chatScrollContainer!: ElementRef;

  // Devices & Selection
  public devices: any[] = [];
  public selectedDeviceId: number | null = null;
  public loadingDevices = true;

  // Selected Router Details
  public isOnline = false;
  public uptime = "";
  public firmware = "";
  public architecture = "";
  public model = "";
  public ipAddress = "";

  // Connected Clients
  public clients: any[] = [];
  public loadingClients = false;

  // Wi-Fi Interfaces & Form
  public wifiInterfaces: any[] = [];
  public selectedWifiInterface: any = null;
  public loadingWifiInterfaces = false;
  public wifiForm: FormGroup;
  public updatingWifi = false;
  public wifiSuccessMsg = "";
  public wifiErrorMsg = "";
  public activeToolTab = 'wifi';

  // Diagnostics (Ping)
  public pingTarget = "";
  public pingCount = 4;
  public pinging = false;
  public pingResults: any[] = [];
  public pingSuccessMsg = "";
  public pingErrorMsg = "";

  // Power (Reboot)
  public rebooting = false;
  public rebootConfirmVisible = false;
  public rebootSuccessMsg = "";
  public rebootErrorMsg = "";

  // Charts & Metrics
  public devsensors: any = null;
  public delta = "live";
  public total_type = "bps";
  public loadingSensors = false;
  private sensorsTimer: any = null;

  public selectedDeviceName = "";


  constructor(
    private data_provider: dataProvider,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.wifiForm = new FormGroup({
      interface_name: new FormControl(''),
      interface_type: new FormControl('legacy'),
      ssid: new FormControl(''),
      password: new FormControl('', [Validators.minLength(8)])
    });


  }

  private deviceChangeSub: any;

  get selectedDeviceHasWebfig(): boolean {
    if (!this.selectedDeviceId) return false;
    const dev = this.devices.find(d => +d.id === +this.selectedDeviceId!);
    return dev ? dev.allow_webfig === true : false;
  }

  ngOnInit(): void {

    // Listen to global router selection changes
    this.deviceChangeSub = (event: Event) => {
      const customEvent = event as CustomEvent;
      this.selectedDeviceId = +(customEvent.detail);
      this.onDeviceChange();
      this.cdr.detectChanges();
    };
    window.addEventListener('customerDeviceChanged', this.deviceChangeSub);

    // Initial load
    this.loadDevices();
  }

  ngAfterViewChecked() {
  }

  ngOnDestroy() {
    if (this.sensorsTimer) {
      clearInterval(this.sensorsTimer);
    }
    if (this.deviceChangeSub) {
      window.removeEventListener('customerDeviceChanged', this.deviceChangeSub);
    }
  }


  loadDevices() {
    this.loadingDevices = true;
    this.data_provider.customerGetDevices().then((res: any) => {
      this.loadingDevices = false;
      if (res && res.result && Array.isArray(res.result)) {
        this.devices = res.result;
      } else if (Array.isArray(res)) {
        this.devices = res;
      } else {
        this.devices = [];
      }

      if (this.devices.length > 0) {
        const cached = localStorage.getItem('customer_selected_device_id');
        if (cached && this.devices.some(d => +d.id === +cached)) {
          this.selectedDeviceId = +cached;
        } else {
          this.selectedDeviceId = +this.devices[0].id;
          localStorage.setItem('customer_selected_device_id', this.selectedDeviceId.toString());
          window.dispatchEvent(new CustomEvent('customerDeviceChanged', { detail: this.selectedDeviceId }));
        }
        this.onDeviceChange();
      }
      this.cdr.detectChanges();
    }).catch(err => {
      this.loadingDevices = false;
      this.devices = [];
      this.cdr.detectChanges();
    });
  }

  onDeviceChange() {
    if (!this.selectedDeviceId) return;

    const dev = this.devices.find(d => +d.id === +this.selectedDeviceId!);
    if (dev) {
      this.ipAddress = dev.ip || 'N/A';
      this.model = dev.router_type || dev.name || 'N/A';
      this.firmware = dev.current_firmware || 'N/A';
      this.architecture = dev.arch || 'N/A';
      this.uptime = dev.uptime || 'N/A';
      this.isOnline = dev.online === true;
      this.selectedDeviceName = dev.name || dev.router_type || 'N/A';
    }

    this.wifiSuccessMsg = "";
    this.wifiErrorMsg = "";
    this.pingResults = [];
    this.pingSuccessMsg = "";
    this.pingErrorMsg = "";
    this.rebootSuccessMsg = "";
    this.rebootErrorMsg = "";

    this.loadDeviceDetails();
  }

  loadDeviceDetails() {
    if (!this.selectedDeviceId) return;
    
    // Clear existing intervals
    if (this.sensorsTimer) {
      clearInterval(this.sensorsTimer);
      this.sensorsTimer = null;
    }
    this.devsensors = null;

    // Load metrics if online
    if (this.isOnline) {
      this.loadSensors();
      this.sensorsTimer = setInterval(() => {
        this.loadSensors();
      }, 30000);
    }
  }

  loadSensors() {
    if (!this.selectedDeviceId) return;
    this.loadingSensors = true;
    this.data_provider.get_dev_sensors(+(this.selectedDeviceId), this.delta, this.total_type).then((res: any) => {
      this.loadingSensors = false;
      this.devsensors = res;
      this.cdr.detectChanges();
    }).catch(err => {
      this.loadingSensors = false;
      this.cdr.detectChanges();
    });
  }

  changeDelta(d: string) {
    this.delta = d;
    this.loadSensors();
  }


  // WebFig Proxy Integration
  openWebfig() {
    if (!this.selectedDeviceId) return;
    const dev = this.devices.find(d => +d.id === +this.selectedDeviceId!);
    if (!dev) return;

    // Open proxy window
    const url = `/api/proxy/init?devid=${dev.id}&dev_ip=${dev.ip}`;
    window.open(url, '_blank');
  }

}
