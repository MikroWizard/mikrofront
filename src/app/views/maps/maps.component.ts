import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from "@angular/core";
import { dataProvider } from "../../providers/mikrowizard/data";
import { loginChecker } from "../../providers/login_checker";
import { Router } from "@angular/router";
import { formatInTimeZone } from "date-fns-tz";
import { Network } from 'vis-network/peer';
import { DataSet } from 'vis-data';

@Component({
  templateUrl: "maps.component.html",
  styleUrls: ["maps.component.scss"],
})
export class MapsComponent implements OnInit, OnDestroy {
  public uid: number;
  public uname: string;
  public ispro: boolean = false;
  public tz: string;
  public savedPositions: any = {};
  public savedPositionsKey = "network-layout";
  public selectedDevice: any = null;
  public showWebAccessModal: boolean = false;
  public currentDeviceInfo: any = null;
  public showResetModal: boolean = false;
  public loadingMap: boolean = false;
  private pollingTimer: any;
  private isDestroyed: boolean = false;

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
      if (!_self.ispro)
        setTimeout(function () {
          _self.router.navigate(["dashboard"]);
        }, 100);
      _self.tz = res.tz;
    });
  }

  @ViewChild('network', { static: true }) networkContainer: ElementRef | undefined;

  mikrotikData: any[] = [];

  ngOnInit(): void {
    this.loadFontAwesome();
    this.savedPositions = JSON.parse(localStorage.getItem(this.savedPositionsKey) || "{}");
    this.loadNetworkData();
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
    }
  }

  loadNetworkData(): void {
    if (this.isDestroyed) return;
    clearTimeout(this.pollingTimer);
    this.loadingMap = true;
    this.data_provider.getNetworkMap().then((res) => {
      if (this.isDestroyed) return;
      // Normalize response - handle array or object with 'result' property
      const data = (res && res.result) ? res.result : res;
      
      if (Array.isArray(data) && data.length > 0) {
        this.loadingMap = false;
        this.mikrotikData = data;
        setTimeout(() => {
          this.createNetworkMap();
        }, 100);
      } else {
        console.log("Map data is empty, likely generating. Retrying in 30s...");
        this.mikrotikData = [];
        this.pollingTimer = setTimeout(() => {
          this.loadNetworkData();
        }, 30000);
      }
    }).catch(err => {
      console.error("Error loading network map:", err);
      this.loadingMap = false;
    });
  }

  refreshData(): void {
    this.selectedDevice = null;
    this.loadNetworkData();
  }



  loadFontAwesome() {
    if (!document.querySelector('link[href*="font-awesome"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
      document.head.appendChild(link);
    }
  }

  createNetworkMap() {
    const container = this.networkContainer?.nativeElement;
    if (!container) return;

    let nodes = new DataSet<any>([]);
    let edges = new DataSet<any>([]);
    let deviceMap: { [key: string]: string } = {}; // uniqueId (hostname) to nodeId mapping
    let allDevices: { [key: string]: any } = {};   // uniqueId to device info mapping
    let macToDevice: { [key: string]: string } = {}; // MAC -> uniqueId (hostname) mapping
    const hasSavedPositions = Object.keys(this.savedPositions).length > 0;
    let nodeIdCounter = 1;

    // Collect all devices using hostname as consistent unique ID
    this.mikrotikData.forEach((device) => {
      const deviceId = device.name; // Use name (hostname) as unique ID

      if (!allDevices[deviceId]) {
        allDevices[deviceId] = {
          name: device.name,
          type: 'Router',
          brand: 'MikroTik'
        };
      }

      Object.entries(device.interfaces).forEach(([_, iface]: [string, any]) => {
        if (iface.mac) {
          macToDevice[iface.mac] = deviceId; // Map to hostname
        }

        if (iface.neighbors && Array.isArray(iface.neighbors)) {
          iface.neighbors.forEach((neighbor: any) => {
            const neighborId = neighbor.hostname || 'Unknown'; // Use hostname

            if (!allDevices[neighborId]) {
              allDevices[neighborId] = {
                name: neighbor.hostname || neighbor.mac || 'Unknown',
                type: neighbor.type || 'Router',
                brand: neighbor.brand || 'MikroTik'
              };
            }

            if (neighbor.mac) {
              macToDevice[neighbor.mac] = neighborId; // Map to hostname
            }
          });
        }
      });
    });

    // Create nodes
    Object.entries(allDevices).forEach(([uniqueId, device]: [string, any]) => {
      const nodeId = `node_${nodeIdCounter++}`;
      deviceMap[uniqueId] = nodeId;

      nodes.add({
        id: nodeId,
        label: device.name,
        shape: 'image',
        image: this.getDeviceIcon(device.type || 'Unknown', device.brand || 'Unknown'),
        size: 15,
        font: { size: 11, color: '#333', face: 'Arial, sans-serif' },
        ...(hasSavedPositions && this.savedPositions[nodeId]
          ? { x: this.savedPositions[nodeId].x, y: this.savedPositions[nodeId].y }
          : {})
      } as any);
    });

// Create edges - collect all connections first
let connectionMap: { [key: string]: string[] } = {};

this.mikrotikData.forEach((device) => {
  const deviceName = device.name;
  Object.entries(device.interfaces).forEach(([ifaceName, iface]: [string, any]) => {
    const sourceDeviceId = iface.mac ? macToDevice[iface.mac] : deviceName;

    if (iface.neighbors && Array.isArray(iface.neighbors)) {
      iface.neighbors.forEach((neighbor: any) => {
        const targetDeviceId = neighbor.mac ? macToDevice[neighbor.mac] : null;

        if (deviceMap[sourceDeviceId] && targetDeviceId && deviceMap[targetDeviceId]) {
          const connectionKey = [sourceDeviceId, targetDeviceId].sort().join('_');
          const interfacePair = neighbor.interface ? `${ifaceName}↔${neighbor.interface}` : ifaceName;
          
          if (!connectionMap[connectionKey]) {
            connectionMap[connectionKey] = [];
          }
          
          if (!connectionMap[connectionKey].includes(interfacePair)) {
            connectionMap[connectionKey].push(interfacePair);
          }
        }
      });
    }
  });
});

// Create edges with combined labels
Object.entries(connectionMap).forEach(([connectionKey, interfacePairs]) => {
  const [sourceDeviceId, targetDeviceId] = connectionKey.split('_');
  let edgeLabel = interfacePairs.join('\n');
  
  // Limit to max 2 interface pairs to avoid overcrowding
  if (interfacePairs.length > 2) {
    edgeLabel = interfacePairs.slice(0, 2).join('\n') + '\n+' + (interfacePairs.length - 2);
  }
  
  edges.add({
    id: connectionKey,
    from: deviceMap[sourceDeviceId],
    to: deviceMap[targetDeviceId],
    label: edgeLabel,
    color: { color: '#34495e', highlight: '#3498db' },
    width: 3,
    smooth: { type: 'continuous', roundness: 0.1 },
    font: {
      size: 9,
      color: '#2c3e50',
      face: 'Arial, sans-serif',
      strokeWidth: 2,
      strokeColor: '#ffffff',
      align: 'horizontal'
    }
  } as any);
});
    const data = { nodes, edges };
    const options = { physics: { enabled: true, stabilization: { iterations: 100 }, barnesHut: { gravitationalConstant: -8000, centralGravity: 0.3, springLength: 200, springConstant: 0.04, damping: 0.09 } }, interaction: { hover: true, dragNodes: true, dragView: true, zoomView: true, hoverConnectedEdges: false, selectConnectedEdges: false, navigationButtons: false, keyboard: false }, nodes: { borderWidth: 3, shadow: true }, edges: { shadow: true, smooth: true, length: 150 }, manipulation: { enabled: false } };
    const network = new Network(container, data, options);

    // Keep your existing events (dragEnd, click, stabilization, etc.)
    // No changes needed below
    network.on('dragEnd', () => {
      const positions = network.getPositions();
      this.savedPositions = positions;
      localStorage.setItem(this.savedPositionsKey, JSON.stringify(positions));
    });

    network.on('click', (event: any) => {
      if (event.nodes[0]) {
        const clickedNode = nodes.get(event.nodes[0]);
        const canvasPosition = network.canvasToDOM(event.pointer.canvas);
        const containerRect = container.getBoundingClientRect();
        const mainContainer = document.querySelector('.main-container') as HTMLElement;
        const mainRect = mainContainer?.getBoundingClientRect() || containerRect;

        let adjustedX = canvasPosition.x + containerRect.left - mainRect.left + 20;
        let adjustedY = canvasPosition.y + containerRect.top - mainRect.top - 50;

        const popupWidth = 280;
        const maxPopupHeight = window.innerHeight - 40;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (adjustedX + popupWidth > viewportWidth) adjustedX -= popupWidth + 40;
        if (adjustedY + maxPopupHeight > viewportHeight) adjustedY = viewportHeight - maxPopupHeight - 20;
        if (adjustedX < 20) adjustedX = 20;
        if (adjustedY < 20) adjustedY = 20;

        this.handleNodeClick(clickedNode, { x: adjustedX, y: adjustedY });
      }
    });

    network.on('stabilizationIterationsDone', () => {
      network.fit();
      if (!hasSavedPositions) {
        const positions = network.getPositions();
        this.savedPositions = positions;
        localStorage.setItem(this.savedPositionsKey, JSON.stringify(positions));
      }
    });

    if (hasSavedPositions) {
      setTimeout(() => network.fit(), 500);
    }
  }

  handleNodeClick(node: any, position?: { x: number, y: number }) {
    this.selectedDevice = node;
    if (position) {
      this.selectedDevice.popupPosition = position;
    }
  }

  closeDeviceDetails() {
    this.selectedDevice = null;
  }

  getDeviceInfo() {
    if (!this.selectedDevice) return null;
    
    const device = this.mikrotikData.find(d => d.name === this.selectedDevice.label);
    
    if (device) {
      // Main device found
      const interfaces = Object.entries(device.interfaces).map(([name, data]: [string, any]) => ({
        name,
        address: data.address || 'N/A',
        mac: data.mac || 'N/A',
        neighbors: data.neighbors?.length || 0
      }));
      
      const interfaceWithNeighbors = Object.values(device.interfaces)
        .find((iface: any) => iface.neighbors?.length > 0) as any;
      const firstNeighbor = interfaceWithNeighbors?.neighbors?.[0];
      
      return {
        name: device.name,
        deviceId: device.device_id,
        type: firstNeighbor?.type || 'Router',
        brand: firstNeighbor?.brand || 'MikroTik',
        board: firstNeighbor?.board || 'Unknown',
        version: firstNeighbor?.version || 'Unknown',
        systemDescription: firstNeighbor?.['system-description'] || null,
        softwareId: firstNeighbor?.['software-id'] || 'N/A',
        interfaces
      };
    } else {
      // Search in neighbor data
      for (const mainDevice of this.mikrotikData) {
        for (const iface of Object.values(mainDevice.interfaces)) {
          const neighbor = (iface as any).neighbors?.find((n: any) => n.hostname === this.selectedDevice.label);
          if (neighbor) {
            return {
              name: neighbor.hostname,
              deviceId: null,
              type: neighbor.type || 'Router',
              brand: neighbor.brand || 'MikroTik',
              board: neighbor.board || 'Unknown',
              version: neighbor.version || 'Unknown',
              systemDescription: neighbor['system-description'] || null,
              softwareId: neighbor['software-id'] || 'N/A',
              interfaces: [{ name: neighbor.interface || 'Unknown', address: neighbor.address || 'N/A', mac: neighbor.mac || 'N/A', neighbors: 0 }]
            };
          }
        }
      }
    }
    
    return null;
  }

  getNodeColor(deviceType: string): string {
    const colors = {
      'gateway': '#dc3545',
      'router': '#fd7e14',
      'switch': '#6f42c1',
      'ap': '#20c997',
      'cpe': '#0dcaf0'
    };
    return (colors as any)[deviceType] || '#6c757d';
  }

  getNodeBorderColor(deviceType: string): string {
    const borderColors = {
      'gateway': '#b02a37',
      'router': '#e8681a',
      'switch': '#59359a',
      'ap': '#1aa179',
      'cpe': '#0baccc'
    };
    return (borderColors as any)[deviceType] || '#495057';
  }

  getDeviceIcon(deviceType: string, brand: string): string {
    const basePath = './assets/Network-Icons-SVG/';
    const type = deviceType.toLowerCase();
    const brandName = brand.toLowerCase();
    
    // MikroTik devices
    if (brandName === 'mikrotik') {
      if (type === 'switch') {
        return `${basePath}cumulus-switch-v2.svg`;
      }
      return `${basePath}cumulus-router-v2.svg`;
    }
    
    // Cisco devices
    if (brandName === 'cisco') {
      if (type === 'switch') {
        return `${basePath}cisco-switch-l2.svg`;
      }
      return `${basePath}cisco-router.svg`;
    }
    
    // Juniper devices
    if (brandName === 'juniper') {
      if (type === 'switch') {
        return `${basePath}juniper-switch-l2.svg`;
      }
      return `${basePath}juniper-router.svg`;
    }
    
    // HPE/Aruba devices
    if (brandName === 'hpe/aruba' || brandName === 'aruba' || brandName === 'hpe') {
      if (type === 'server') {
        return `${basePath}generic-server-1.svg`;
      }
      return `${basePath}arista-switch.svg`;
    }
    
    // Ubiquiti devices
    if (brandName === 'ubiquiti' || brandName === 'ubnt') {
      if (type === 'switch') {
        return `${basePath}generic-switch-l2-v1-colour.svg`;
      }
      return `${basePath}generic-router-colour.svg`;
    }
    
    // Default icons by type
    const defaultIcons = {
      'switch': `${basePath}generic-switch-l2-v1-colour.svg`,
      'router': `${basePath}generic-router-colour.svg`,
      'router/switch': `${basePath}generic-router-colour.svg`,
      'server': `${basePath}generic-server-1.svg`,
      'unknown': `${basePath}generic-router-colour.svg`
    };
    
    return (defaultIcons as any)[type] || `${basePath}generic-router-colour.svg`;
  }

  getDefaultPosition(deviceName: string, index: number): { x: number, y: number } {
    const positions = {
      'Core Router': { x: 0, y: 0 },
      'Edge Router': { x: -200, y: -100 },
      'Distribution Switch': { x: 200, y: -100 },
      'Access Point 1': { x: 100, y: 100 },
      'Access Point 2': { x: 300, y: 100 },
      'Customer Router 1': { x: 0, y: 200 },
      'Customer Router 2': { x: 200, y: 200 }
    };
    return (positions as any)[deviceName] || { x: index * 100, y: index * 50 };
  }

  webAccess() {
    if (!this.selectedDevice) return;
    this.currentDeviceInfo = this.getDeviceInfo();
    this.showWebAccessModal = true;
    this.closeDeviceDetails();
  }

  openProxyAccess() {
    if (this.currentDeviceInfo?.deviceId) {
      window.open(`/api/proxy/init?devid=${this.currentDeviceInfo.deviceId}`, '_blank');
    } else {
      const ip = this.currentDeviceInfo?.interfaces.find((iface: any) => iface.address !== 'N/A')?.address?.split('/')[0];
      if (ip) {
        window.open(`/api/proxy/init?dev_ip=${ip}`, '_blank');
      }
    }
    this.showWebAccessModal = false;
  }

  openDirectAccess() {
    const ip = this.currentDeviceInfo?.interfaces.find((iface: any) => iface.address !== 'N/A')?.address?.split('/')[0];
    if (ip) {
      window.open(`http://${ip}`, '_blank');
    }
    this.showWebAccessModal = false;
  }

  closeWebAccessModal() {
    this.showWebAccessModal = false;
  }

  getNeighborCount() {
    const deviceInfo = this.getDeviceInfo();
    return deviceInfo?.interfaces.reduce((total, iface) => total + iface.neighbors, 0) || 0;
  }

  getPrimaryIP() {
    const deviceInfo = this.getDeviceInfo();
    const primaryInterface = deviceInfo?.interfaces.find(iface => iface.address !== 'N/A');
    return primaryInterface?.address?.split('/')[0] || 'N/A';
  }

  getDeviceInterfaces() {
    const deviceInfo = this.getDeviceInfo();
    return deviceInfo?.interfaces || [];
  }

  showMoreInfo() {
    const deviceInfo = this.getDeviceInfo();
    if (deviceInfo?.deviceId) {
      window.open(`/#/device-stats;id=${deviceInfo.deviceId}`, '_blank');
    }
  }

  pingDevice(devid: number) {
    console.log('Ping device:', this.selectedDevice);
    // Implement ping functionality
  }

  configureDevice(devid: number) {
    console.log('Configure device:', this.selectedDevice);
    // Implement configuration interface
  }

  resetLocations() {
    localStorage.removeItem(this.savedPositionsKey);
    this.savedPositions = {};
    this.refreshData();
  }

  confirmResetMap() {
    this.showResetModal = false;
    this.loadingMap = true;
    this.mikrotikData = [];
    this.selectedDevice = null;

    this.data_provider.resetNetworkMap().then((res) => {
      if (res.status === 'success') {
        localStorage.removeItem(this.savedPositionsKey);
        this.savedPositions = {};
        this.loadNetworkData();
      } else {
        this.loadingMap = false;
        alert("Error: " + (res.error || "Failed to reset map"));
      }
    }).catch(err => {
      this.loadingMap = false;
      alert("Error resetting map: " + err);
    });
  }

}