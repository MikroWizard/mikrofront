import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { dataProvider } from '../../../providers/mikrowizard/data';

@Component({
  selector: 'app-device-tree',
  templateUrl: './device-tree.component.html',
  styleUrls: ['./device-tree.component.scss']
})
export class DeviceTreeComponent implements OnInit {
  @Output() deviceSelected = new EventEmitter<any>();
  devices: any[] = [];
  groups: any[] = [];
  groupedDevices: any[] = [];
  favoriteDevices: any[] = [];
  loading = true;
  searchTerm: string = '';
  contextMenuVisible = false;
  contextMenuPosition = { x: 0, y: 0 };
  selectedDeviceForContext: any = null;
  public ispro: boolean = false;

  constructor(private data_provider: dataProvider) {}

  ngOnInit() {
    this.refresh();
  }

  refresh() {
    this.loading = true;
    this.data_provider.getSessionInfo().then((user: any) => {
      this.ispro = user['ISPRO'];
      Promise.all([
        this.data_provider.get_groups(),
        (user && user.role === 'customer') ? this.data_provider.customerGetDevices() : this.data_provider.get_devices(),
        (user && user.role === 'customer') ? this.data_provider.customerTerminalGetFavorites() : this.data_provider.terminalGetFavorites()
      ]).then(([gRes, dRes, fRes]: any) => {
        this.groups = gRes.result || gRes || [];
        this.devices = dRes.result || dRes || [];
        
        let favs: string[] = [];
        const favData = fRes.result || fRes || {};
        if (favData.favorites) {
            favs = favData.favorites.map((f:any) => String(f.device_id));
        }
        
        this.devices.forEach(d => {
            d.is_favorite = favs.includes(String(d.id));
        });

        this.buildTree();
        this.loading = false;
      }).catch((err: any) => {
        this.loading = false;
      });
    });
  }

  buildTree() {
    const ungrouped: any = {
      id: 0,
      name: 'Ungrouped',
      devices: [],
      expanded: true
    };
    
    const favoritesGroup: any = {
      id: -1,
      name: 'Favorites',
      devices: [],
      expanded: true,
      isFavorites: true
    };
    
    // Create group map
    const groupMap = new Map();
    this.groups.forEach(g => {
      groupMap.set(g.id, {
        id: g.id,
        name: g.name,
        devices: [],
        expanded: true
      });
    });

    // Assign devices to groups
    this.devices.forEach(d => {
      if (d.is_favorite) {
          favoritesGroup.devices.push(d);
      }
      
      if (d.group_id && groupMap.has(d.group_id)) {
        groupMap.get(d.group_id).devices.push(d);
      } else {
        ungrouped.devices.push(d);
      }
    });

    this.groupedDevices = [];
    if (favoritesGroup.devices.length > 0) {
      this.groupedDevices.push(favoritesGroup);
    }
    
    this.groupedDevices = this.groupedDevices.concat(Array.from(groupMap.values()).filter((g:any) => g.devices.length > 0));
    
    if (ungrouped.devices.length > 0) {
      this.groupedDevices.push(ungrouped);
    }
  }

  get filteredGroups() {
    if (!this.searchTerm.trim()) return this.groupedDevices;
    
    const term = this.searchTerm.toLowerCase();
    const result: any[] = [];
    
    this.groupedDevices.forEach(g => {
      const filteredDevs = g.devices.filter((d:any) => 
        (d.name && d.name.toLowerCase().includes(term)) || 
        (d.ip && d.ip.includes(term))
      );
      
      if (filteredDevs.length > 0) {
        result.push({ ...g, devices: filteredDevs, expanded: true });
      }
    });
    
    return result;
  }

  toggleFavorite(device: any, event: Event) {
    event.stopPropagation();
    device.is_favorite = !device.is_favorite;
    
    const favIds = this.devices.filter(d => d.is_favorite).map(d => d.id);
    
    this.data_provider.getSessionInfo().then((user: any) => {
        const p = (user && user.role === 'customer') ? 
            this.data_provider.customerTerminalSaveFavorites(favIds) : 
            this.data_provider.terminalSaveFavorites(favIds);
            
        p.then(() => this.buildTree());
    });
  }

  toggleGroup(group: any) {
    group.expanded = !group.expanded;
  }

  selectDevice(device: any, protocol?: string) {
    this.deviceSelected.emit({ device, protocol });
  }

  connectDefault(device: any) {
    this.selectDevice(device);
  }

  connectProtocol(device: any, protocol: string) {
    this.selectDevice(device, protocol);
  }
  
  hasProtocol(device: any, proto: string): boolean {
      if (device.connection_types && Array.isArray(device.connection_types) && device.connection_types.length > 0) {
          return device.connection_types.includes(proto);
      }
      if (device.protocols && Array.isArray(device.protocols) && device.protocols.length > 0) {
          return device.protocols.includes(proto);
      }
      
      // Defaults if not specified by backend
      if (proto === 'webfig') return (device.device_type === 'mikrotik' || device.brand === 'mikrotik');
      
      // Only default to ssh true for mikrotik devices without connection_types
      // If it's a non-mikrotik device without connection_types, assume ssh is available
      if (proto === 'ssh') return true;
      
      return false; 
  }

  getBrandIcon(device: any): string {
    const basePath = './assets/Network-Icons-SVG/';
    const brand = (device.brand || '').toLowerCase();
    const dtype = (device.device_type || '').toLowerCase();
    const identifier = brand || dtype;

    const brandMap: Record<string, string> = {
      'mikrotik': 'logo-mikrotik.svg',
      'cisco': 'logo-cisco.svg',
      'cisco_ios': 'logo-cisco.svg',
      'cisco_xr': 'logo-cisco.svg',
      'cisco_nxos': 'logo-cisco.svg',
      'huawei': 'logo-huawei.svg',
      'juniper': 'logo-juniper.svg',
      'junos': 'logo-juniper.svg',
      'hpe': 'logo-hpe.svg',
      'aruba': 'logo-aruba.svg',
      'hpe/aruba': 'logo-aruba.svg',
      'ubiquiti': 'logo-ubiquiti.svg',
      'ubnt': 'logo-ubiquiti.svg',
      'fortinet': 'logo-fortinet.svg',
      'fortigate': 'logo-fortinet.svg',
      'paloalto': 'logo-paloalto.svg',
      'palo_alto': 'logo-paloalto.svg',
      'dell': 'logo-dell.svg',
      'arista': 'logo-arista.svg',
      'dlink': 'logo-dlink.svg',
      'd-link': 'logo-dlink.svg',
      'tplink': 'logo-tplink.svg',
      'tp-link': 'logo-tplink.svg',
      'zyxel': 'logo-zyxel.svg',
      'extreme': 'logo-extreme.svg',
      'netgear': 'logo-netgear.svg',
      'brocade': 'logo-brocade.svg',
      'f5': 'logo-f5.svg',
      'ruckus': 'logo-ruckus.svg',
    };

    if (brandMap[identifier]) {
      return basePath + brandMap[identifier];
    }

    return basePath + 'generic-router-colour.svg';
  }

  onContextMenu(event: MouseEvent, device: any) {
    event.preventDefault();
    this.selectedDeviceForContext = device;
    this.contextMenuPosition = { x: event.clientX, y: event.clientY };
    this.contextMenuVisible = true;
  }

  closeContextMenu() {
    this.contextMenuVisible = false;
  }
  
  openToolModal(tool: string) {
      // For now we just emit an event to the parent, or if we have modals here, open them.
      // E.g. 'ping', 'logs'
      this.closeContextMenu();
      this.deviceSelected.emit({ device: this.selectedDeviceForContext, tool: tool });
  }

  openDeviceDetails() {
      this.closeContextMenu();
      window.open('#/device-stats;id=' + this.selectedDeviceForContext.id, '_blank');
  }
}
