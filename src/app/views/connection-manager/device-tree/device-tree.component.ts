import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { dataProvider } from '../../../providers/mikrowizard/data';

export interface CustomCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  device_ids: number[];
}

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
  customCategories: CustomCategory[] = [];
  loading = true;
  searchTerm: string = '';
  allExpanded: boolean = true;
  
  // Grouping Mode
  groupBy: 'admin_groups' | 'custom_categories' | 'type' | 'brand' | 'flat' = 'admin_groups';
  
  // Filters
  filterPopoverVisible: boolean = false;
  favoritesOnly: boolean = false;
  filterGroupIds: number[] = [];
  filterCategoryIds: string[] = [];
  filterTypes: string[] = [];
  filterBrands: string[] = [];

  // Context Menu
  contextMenuVisible = false;
  contextMenuPosition = { x: 0, y: 0 };
  selectedDeviceForContext: any = null;

  // Popover Positioning & Active Tab
  filterPopoverPos = { top: 52, left: 265 };
  flyoutTab: 'group' | 'filter' = 'group';

  // Category Modal
  showCategoryModal: boolean = false;
  categoryModalMode: 'create' | 'edit' = 'create';
  categoryForm: { id?: string; name: string; color: string; icon: string; pendingDeviceId?: number } = {
    name: '',
    color: '#38bdf8',
    icon: 'fa-folder'
  };
  showImportExport: boolean = false;
  importJsonText: string = '';

  // Curated high-contrast accessible colors
  availableColors: string[] = [
    '#38bdf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa',
    '#f472b6', '#22d3ee', '#fb923c', '#a3e635', '#e2e8f0'
  ];

  // Curated rich icons
  availableIcons: string[] = [
    'fa-folder', 'fa-server', 'fa-desktop', 'fa-window-restore',
    'fa-network-wired', 'fa-building', 'fa-calculator', 'fa-shield-halved',
    'fa-database', 'fa-globe', 'fa-cloud', 'fa-terminal', 'fa-tags', 'fa-star', 'fa-box'
  ];

  public ispro: boolean = false;

  constructor(private data_provider: dataProvider) {}

  ngOnInit() {
    const savedGroupBy = localStorage.getItem('mw_cm_group_by');
    if (savedGroupBy && ['admin_groups', 'custom_categories', 'type', 'brand', 'flat'].includes(savedGroupBy)) {
      this.groupBy = savedGroupBy as any;
    }
    this.refresh();
  }

  refresh() {
    this.loading = true;
    this.data_provider.getSessionInfo().then((user: any) => {
      this.ispro = user && user['ISPRO'];
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
            favs = favData.favorites.map((f: any) => String(f.device_id));
        }
        
        this.devices.forEach(d => {
            d.is_favorite = favs.includes(String(d.id));
        });

        // Load and reconcile custom categories
        this.loadCustomCategories();
        this.loading = false;
      }).catch(() => {
        this.loading = false;
      });
    });
  }

  // ─── Custom Categories Management & Self-Healing ───
  loadCustomCategories() {
    // 1. Read local storage first for immediate rendering
    try {
      const stored = localStorage.getItem('mw_cm_custom_categories');
      if (stored) {
        this.customCategories = JSON.parse(stored) || [];
      }
    } catch (e) {
      this.customCategories = [];
    }

    // 2. Fetch global categories from backend if available
    this.data_provider.terminalGetCategories().then((res: any) => {
      if (res && res.status === 'success' && Array.isArray(res.categories)) {
        if (res.categories.length > 0) {
          this.customCategories = res.categories;
          localStorage.setItem('mw_cm_custom_categories', JSON.stringify(this.customCategories));
        } else if (this.customCategories.length > 0) {
          // If server is empty but local has data, sync local to server
          this.data_provider.terminalSaveCategories(this.customCategories).catch(() => {});
        }
      }
      this.reconcileCategories();
      this.buildTree();
    }).catch(() => {
      this.reconcileCategories();
      this.buildTree();
    });
  }

  reconcileCategories() {
    if (!this.devices || !this.devices.length) return;
    const activeIds = new Set(this.devices.map(d => Number(d.id)));
    let changed = false;
    this.customCategories.forEach(cat => {
      const initialLen = (cat.device_ids || []).length;
      cat.device_ids = (cat.device_ids || []).filter(id => activeIds.has(Number(id)));
      if (cat.device_ids.length !== initialLen) {
        changed = true;
      }
    });
    if (changed) {
      this.persistCategories();
    }
  }

  persistCategories() {
    try {
      localStorage.setItem('mw_cm_custom_categories', JSON.stringify(this.customCategories));
    } catch (e) {}
    this.data_provider.terminalSaveCategories(this.customCategories).catch(() => {});
  }

  // ─── Tree Builder Engine ───
  buildTree() {
    const expandedMap = new Map<string, boolean>();
    this.groupedDevices.forEach(g => {
      const key = g.categoryId || String(g.id) || g.name;
      expandedMap.set(key, g.expanded);
    });

    const isGroupExpanded = (key: string, defVal: boolean = true) => {
      return expandedMap.has(key) ? !!expandedMap.get(key) : defVal;
    };

    const favoritesGroup: any = {
      id: -1,
      name: 'Favorites',
      devices: [],
      expanded: isGroupExpanded('Favorites', true),
      isFavorites: true
    };

    if (this.groupBy === 'flat') {
      const allDevs = [...this.devices].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      this.groupedDevices = [{
        id: 0,
        name: 'All Devices',
        devices: allDevs,
        expanded: true
      }];
      return;
    }

    if (this.groupBy === 'custom_categories') {
      const assignedDeviceIds = new Set<number>();
      const catGroups: any[] = [];

      this.customCategories.forEach(cat => {
        const catDevs: any[] = [];
        (cat.device_ids || []).forEach(did => {
          const d = this.devices.find(dev => Number(dev.id) === Number(did));
          if (d) {
            catDevs.push(d);
            assignedDeviceIds.add(Number(d.id));
          }
        });

        catGroups.push({
          id: cat.id,
          categoryId: cat.id,
          name: cat.name,
          color: cat.color || '#4e9af1',
          icon: cat.icon || 'fa-folder',
          isCustomCategory: true,
          devices: catDevs,
          expanded: isGroupExpanded(cat.id, true)
        });
      });

      const uncategorizedDevs = this.devices.filter(d => !assignedDeviceIds.has(Number(d.id)));
      const uncategorizedGroup: any = {
        id: 'uncategorized',
        name: 'Uncategorized',
        devices: uncategorizedDevs,
        expanded: isGroupExpanded('uncategorized', true)
      };

      // Add favorites to favorite group
      this.devices.forEach(d => {
        if (d.is_favorite) favoritesGroup.devices.push(d);
      });

      this.groupedDevices = [];
      if (favoritesGroup.devices.length > 0) {
        this.groupedDevices.push(favoritesGroup);
      }
      this.groupedDevices = this.groupedDevices.concat(catGroups);
      if (uncategorizedGroup.devices.length > 0) {
        this.groupedDevices.push(uncategorizedGroup);
      }
      return;
    }

    if (this.groupBy === 'type') {
      const typeMap: Record<string, { name: string; icon: string; devices: any[] }> = {
        'app': { name: 'Applications', icon: 'fa-window-restore', devices: [] },
        'rdp': { name: 'RDP Hosts (Windows)', icon: 'fa-brands fa-windows', devices: [] },
        'mikrotik': { name: 'MikroTik Routers', icon: 'fa-microchip', devices: [] },
        'ssh': { name: 'Network / SSH', icon: 'fa-terminal', devices: [] },
        'vnc': { name: 'VNC Consoles', icon: 'fa-desktop', devices: [] },
        'other': { name: 'Other Devices', icon: 'fa-network-wired', devices: [] }
      };

      this.devices.forEach(d => {
        if (d.is_favorite) favoritesGroup.devices.push(d);
        if (this.isApp(d)) {
          typeMap['app'].devices.push(d);
        } else if (this.isRdpHost(d)) {
          typeMap['rdp'].devices.push(d);
        } else if (this.isMikrotik(d)) {
          typeMap['mikrotik'].devices.push(d);
        } else if (this.isVnc(d)) {
          typeMap['vnc'].devices.push(d);
        } else if (this.hasProtocol(d, 'ssh')) {
          typeMap['ssh'].devices.push(d);
        } else {
          typeMap['other'].devices.push(d);
        }
      });

      this.groupedDevices = [];
      if (favoritesGroup.devices.length > 0) {
        this.groupedDevices.push(favoritesGroup);
      }
      Object.keys(typeMap).forEach(key => {
        const t = typeMap[key];
        if (t.devices.length > 0) {
          this.groupedDevices.push({
            id: key,
            name: t.name,
            icon: t.icon,
            devices: t.devices,
            expanded: isGroupExpanded(key, true)
          });
        }
      });
      return;
    }

    if (this.groupBy === 'brand') {
      const brandMap = new Map<string, any[]>();
      this.devices.forEach(d => {
        if (d.is_favorite) favoritesGroup.devices.push(d);
        const b = (d.brand || d.device_type || 'Generic').toUpperCase();
        if (!brandMap.has(b)) brandMap.set(b, []);
        brandMap.get(b)!.push(d);
      });

      this.groupedDevices = [];
      if (favoritesGroup.devices.length > 0) {
        this.groupedDevices.push(favoritesGroup);
      }
      brandMap.forEach((devs, bName) => {
        this.groupedDevices.push({
          id: bName,
          name: bName,
          devices: devs,
          expanded: isGroupExpanded(bName, true)
        });
      });
      return;
    }

    // Default: 'admin_groups'
    const ungrouped: any = {
      id: 0,
      name: 'Ungrouped',
      devices: [],
      expanded: isGroupExpanded('0', true)
    };
    
    const groupMap = new Map();
    this.groups.forEach(g => {
      groupMap.set(g.id, {
        id: g.id,
        name: g.name,
        devices: [],
        expanded: isGroupExpanded(String(g.id), true)
      });
    });

    this.devices.forEach(d => {
      if (d.is_favorite) {
          favoritesGroup.devices.push(d);
      }
      
      const inMultiGroup = d.group_ids && Array.isArray(d.group_ids) && d.group_ids.some((gid: any) => groupMap.has(gid));
      if (d.group_id && groupMap.has(d.group_id)) {
        groupMap.get(d.group_id).devices.push(d);
      } else if (inMultiGroup) {
        d.group_ids.forEach((gid: any) => {
          if (groupMap.has(gid)) {
            groupMap.get(gid).devices.push(d);
          }
        });
      } else {
        ungrouped.devices.push(d);
      }
    });

    this.groupedDevices = [];
    if (favoritesGroup.devices.length > 0) {
      this.groupedDevices.push(favoritesGroup);
    }
    
    this.groupedDevices = this.groupedDevices.concat(Array.from(groupMap.values()).filter((g: any) => g.devices.length > 0));
    
    if (ungrouped.devices.length > 0) {
      this.groupedDevices.push(ungrouped);
    }
  }

  // ─── Filter & Omnisearch Engine ───
  get filteredGroups() {
    let sourceGroups = this.groupedDevices;
    const hasSearch = !!this.searchTerm.trim();
    const hasActiveFilters = this.favoritesOnly ||
      this.filterGroupIds.length > 0 ||
      this.filterCategoryIds.length > 0 ||
      this.filterTypes.length > 0 ||
      this.filterBrands.length > 0;

    if (!hasSearch && !hasActiveFilters) {
      return sourceGroups;
    }

    const term = this.searchTerm.trim().toLowerCase();
    const result: any[] = [];

    sourceGroups.forEach(g => {
      // In grouped mode, skip groups that don't match group filters
      if (this.filterGroupIds.length > 0 && this.groupBy === 'admin_groups' && g.id > 0 && !this.filterGroupIds.includes(g.id)) {
        return;
      }
      if (this.filterCategoryIds.length > 0 && this.groupBy === 'custom_categories' && g.categoryId && !this.filterCategoryIds.includes(g.categoryId)) {
        return;
      }

      const filteredDevs = g.devices.filter((d: any) => {
        // Favorites
        if (this.favoritesOnly && !d.is_favorite) return false;

        // Group filter (when not grouped by admin_groups)
        if (this.filterGroupIds.length > 0 && this.groupBy !== 'admin_groups') {
          const dGid = d.group_id;
          const dGids = d.group_ids || [];
          const matchesG = this.filterGroupIds.includes(dGid) || dGids.some((id: any) => this.filterGroupIds.includes(id));
          if (!matchesG) return false;
        }

        // Category filter (when not grouped by custom_categories)
        if (this.filterCategoryIds.length > 0 && this.groupBy !== 'custom_categories') {
          const matchesCat = this.customCategories.some(cat =>
            this.filterCategoryIds.includes(cat.id) && (cat.device_ids || []).includes(Number(d.id))
          );
          if (!matchesCat) return false;
        }

        // Type filter
        if (this.filterTypes.length > 0) {
          const matchesType = this.filterTypes.some(t => {
            if (t === 'app') return this.isApp(d);
            if (t === 'rdp') return this.isRdpHost(d);
            if (t === 'mikrotik') return this.isMikrotik(d);
            if (t === 'vnc') return this.isVnc(d);
            if (t === 'ssh') return this.hasProtocol(d, 'ssh') && !this.isMikrotik(d);
            return false;
          });
          if (!matchesType) return false;
        }

        // Brand filter
        if (this.filterBrands.length > 0) {
          const brand = (d.brand || d.device_type || 'generic').toLowerCase();
          if (!this.filterBrands.includes(brand)) return false;
        }

        // Omnisearch
        if (term) {
          return this.matchesSearch(d, term);
        }

        return true;
      });

      if (filteredDevs.length > 0) {
        result.push({ ...g, devices: filteredDevs, expanded: term ? true : g.expanded });
      }
    });

    return result;
  }

  matchesSearch(d: any, term: string): boolean {
    if (!d) return false;
    // Name
    if (d.name && d.name.toLowerCase().includes(term)) return true;
    // IP
    if (d.ip && d.ip.includes(term)) return true;
    if (d.ip_address && d.ip_address.includes(term)) return true;
    const effIp = this.getEffectiveIp(d);
    if (effIp && effIp.includes(term)) return true;
    // Brand, Type, Model
    if (d.brand && d.brand.toLowerCase().includes(term)) return true;
    if (d.device_type && d.device_type.toLowerCase().includes(term)) return true;
    if (d.model && d.model.toLowerCase().includes(term)) return true;
    // App-specific search
    if (this.isApp(d)) {
      if ('app'.includes(term) || 'remoteapp'.includes(term)) return true;
      const parentName = this.getParentServerName(d);
      if (parentName && parentName.toLowerCase().includes(term)) return true;
      let cfg = d.protocol_config;
      if (typeof cfg === 'string') {
        try { cfg = JSON.parse(cfg); } catch (e) { cfg = {}; }
      }
      if (cfg) {
        if (cfg.remote_app && cfg.remote_app.toLowerCase().includes(term)) return true;
        if (cfg.initial_program && cfg.initial_program.toLowerCase().includes(term)) return true;
        if (cfg.remote_app_args && cfg.remote_app_args.toLowerCase().includes(term)) return true;
      }
    }
    // Protocols
    if (d.protocol && d.protocol.toLowerCase().includes(term)) return true;
    if (d.connection_types && Array.isArray(d.connection_types) && d.connection_types.some((c: string) => c.toLowerCase().includes(term))) return true;
    if (d.protocols && Array.isArray(d.protocols) && d.protocols.some((p: string) => p.toLowerCase().includes(term))) return true;
    // Custom Categories
    const inCategories = this.customCategories.some(cat => (cat.device_ids || []).includes(Number(d.id)) && cat.name.toLowerCase().includes(term));
    if (inCategories) return true;
    // Admin Groups
    const inAdminGroup = this.groups.some(g => (g.id === d.group_id || (d.group_ids && d.group_ids.includes(g.id))) && g.name.toLowerCase().includes(term));
    if (inAdminGroup) return true;

    return false;
  }

  get activeFilterCount(): number {
    let count = 0;
    if (this.favoritesOnly) count++;
    count += this.filterGroupIds.length;
    count += this.filterCategoryIds.length;
    count += this.filterTypes.length;
    count += this.filterBrands.length;
    return count;
  }

  setGroupBy(mode: 'admin_groups' | 'custom_categories' | 'type' | 'brand' | 'flat') {
    this.groupBy = mode;
    localStorage.setItem('mw_cm_group_by', mode);
    this.buildTree();
  }

  getGroupByLabel(): string {
    switch (this.groupBy) {
      case 'admin_groups': return 'Admin Groups';
      case 'custom_categories': return 'Custom Categories';
      case 'type': return 'Type & Protocol';
      case 'brand': return 'Brand / Vendor';
      case 'flat': return 'Flat List';
      default: return 'Groups';
    }
  }

  toggleFilterPopover(event?: MouseEvent) {
    if (event) {
      const btn = (event.currentTarget || event.target) as HTMLElement;
      const rect = btn.getBoundingClientRect();
      const sidebar = btn.closest('.cm-sidebar') || btn.closest('.mw-tree');
      const sidebarRight = sidebar ? sidebar.getBoundingClientRect().right : rect.right;
      const top = Math.max(10, Math.min(window.innerHeight - 490, rect.top));
      let left = sidebarRight + 8;
      if (left + 350 > window.innerWidth) {
        left = Math.max(10, window.innerWidth - 360);
      }
      this.filterPopoverPos = { top, left };
    }
    this.filterPopoverVisible = !this.filterPopoverVisible;
  }

  clearAllFilters() {
    this.searchTerm = '';
    this.favoritesOnly = false;
    this.filterGroupIds = [];
    this.filterCategoryIds = [];
    this.filterTypes = [];
    this.filterBrands = [];
    this.buildTree();
  }

  toggleFavoritesOnly() {
    this.favoritesOnly = !this.favoritesOnly;
    this.buildTree();
  }

  toggleExpandAll() {
    this.allExpanded = !this.allExpanded;
    this.groupedDevices.forEach(g => g.expanded = this.allExpanded);
  }

  // ─── Group Icon & Color Helpers ───
  formatFaIcon(icon?: string): string {
    if (!icon) return 'fa-folder';
    return icon.startsWith('fa-') ? icon : 'fa-' + icon;
  }

  getGroupIcon(group: any): string {
    if (!group) return 'fa-folder';
    if (group.isFavorites) return 'fa-star';
    if (group.icon) {
      const icon = group.icon.startsWith('fa-') ? group.icon : 'fa-' + group.icon;
      if (icon === 'fa-folder' && group.expanded) return 'fa-folder-open';
      return icon;
    }
    return group.expanded ? 'fa-folder-open' : 'fa-folder';
  }

  getGroupColor(group: any): string {
    if (!group) return '#f9b115';
    if (group.color) return group.color;
    if (group.isFavorites) return '#fbbf24';
    return '#f9b115';
  }

  // ─── Device Detection & Identification Helpers ───
  isApp(device: any): boolean {
    if (!device) return false;
    if (device.parent_id || device.is_child) return true;
    if (device.protocol_config) {
      if (typeof device.protocol_config === 'string') {
        return device.protocol_config.indexOf('app_mode') > -1;
      }
      return !!device.protocol_config.app_mode;
    }
    return false;
  }

  isRdpHost(device: any): boolean {
    if (!device || this.isMikrotik(device) || this.isApp(device)) return false;
    return this.hasProtocol(device, 'rdp') || this.isRdp(device);
  }

  isMikrotik(device: any): boolean {
    if (!device) return false;
    if (device.parent_id || device.is_child || this.isApp(device)) return false;
    return !device.device_type || device.device_type === 'mikrotik' || device.brand === 'mikrotik';
  }

  isRdp(device: any): boolean {
    if (!device || this.isMikrotik(device)) return false;
    const isWindows = device.device_type === 'windows' || device.brand === 'windows';
    return isWindows || device.protocol === 'rdp' || this.hasProtocol(device, 'rdp') || this.isApp(device);
  }

  isVnc(device: any): boolean {
    if (!device || this.isMikrotik(device)) return false;
    return (device.device_type === 'vnc' || device.protocol === 'vnc' || device.brand === 'vnc' || this.hasProtocol(device, 'vnc')) && !this.isRdp(device);
  }

  isRdpOrVnc(device: any): boolean {
    if (!device) return false;
    return this.isRdp(device) || this.isVnc(device) || this.isApp(device);
  }

  getParentServer(device: any): any {
    if (!device || !device.parent_id) return null;
    return this.devices.find(d => Number(d.id) === Number(device.parent_id)) || null;
  }

  getParentServerName(device: any): string {
    const parent = this.getParentServer(device);
    return parent ? parent.name : (device.parent_server_name || '');
  }

  getEffectiveIp(device: any): string {
    if (!device) return '';
    if (device.ip) return device.ip;
    if (device.ip_address) return device.ip_address;
    const parent = this.getParentServer(device);
    return parent ? (parent.ip || parent.ip_address || parent.peer_ip || '') : '';
  }

  getAppSubtitle(device: any): string {
    const parentName = this.getParentServerName(device);
    if (parentName) {
      return `on ${parentName}`;
    }
    let cfg = device.protocol_config;
    if (typeof cfg === 'string') {
      try { cfg = JSON.parse(cfg); } catch (e) { cfg = {}; }
    }
    if (cfg && cfg.remote_app) return cfg.remote_app;
    if (cfg && cfg.initial_program) return cfg.initial_program;
    return 'RemoteApp';
  }

  // ─── Custom Category User Actions ───
  openCreateCategoryModal(forDevice?: any) {
    this.categoryModalMode = 'create';
    this.categoryForm = {
      name: '',
      color: '#38bdf8',
      icon: 'fa-folder',
      pendingDeviceId: forDevice ? Number(forDevice.id) : undefined
    };
    this.showCategoryModal = true;
  }

  openEditCategoryModal(cat: any, event?: Event) {
    if (event) event.stopPropagation();
    const catId = cat.categoryId || cat.id;
    const existing = this.customCategories.find(c => c.id === catId);
    this.categoryModalMode = 'edit';
    this.categoryForm = {
      id: catId,
      name: existing ? existing.name : (cat.name || ''),
      color: existing ? (existing.color || '#38bdf8') : (cat.color || '#38bdf8'),
      icon: existing ? (existing.icon || 'fa-folder') : (cat.icon || 'fa-folder')
    };
    this.showCategoryModal = true;
  }

  cancelEditCategory() {
    this.categoryModalMode = 'create';
    this.categoryForm = {
      name: '',
      color: '#38bdf8',
      icon: 'fa-folder'
    };
  }

  saveCategoryModal() {
    const name = (this.categoryForm.name || '').trim();
    if (!name) return;

    if (this.categoryModalMode === 'create') {
      const newCat: CustomCategory = {
        id: 'cat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        name: name,
        color: this.categoryForm.color || '#38bdf8',
        icon: this.categoryForm.icon || 'fa-folder',
        device_ids: this.categoryForm.pendingDeviceId ? [this.categoryForm.pendingDeviceId] : []
      };
      this.customCategories.push(newCat);
    } else if (this.categoryModalMode === 'edit' && this.categoryForm.id) {
      const cat = this.customCategories.find(c => c.id === this.categoryForm.id);
      if (cat) {
        cat.name = name;
        cat.color = this.categoryForm.color;
        cat.icon = this.categoryForm.icon;
      }
    }

    this.persistCategories();
    this.buildTree();
    this.cancelEditCategory();
    this.showCategoryModal = false;
  }

  deleteCategory(cat: any, event?: Event) {
    if (event) event.stopPropagation();
    const catId = cat.categoryId || cat.id;
    const target = this.customCategories.find(c => c.id === catId);
    const catName = target ? target.name : (cat.name || 'category');
    if (!confirm(`Delete custom category "${catName}"?`)) return;
    this.customCategories = this.customCategories.filter(c => c.id !== catId);
    if (this.categoryModalMode === 'edit' && this.categoryForm.id === catId) {
      this.cancelEditCategory();
    }
    this.persistCategories();
    this.buildTree();
  }

  isDeviceInCategory(device: any, cat: CustomCategory): boolean {
    if (!device || !cat || !cat.device_ids) return false;
    return cat.device_ids.includes(Number(device.id));
  }

  toggleDeviceCategory(device: any, cat: CustomCategory, event?: Event) {
    if (event) event.stopPropagation();
    if (!device || !cat) return;
    if (!cat.device_ids) cat.device_ids = [];
    const did = Number(device.id);
    const idx = cat.device_ids.indexOf(did);
    if (idx > -1) {
      cat.device_ids.splice(idx, 1);
    } else {
      cat.device_ids.push(did);
    }
    this.persistCategories();
    this.buildTree();
  }

  exportCategories() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.customCategories, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "mikrowizard-custom-categories.json");
    dlAnchorElem.click();
  }

  importCategoriesFromFile(event: any) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.processImportedJson(e.target.result);
    };
    reader.readAsText(file);
  }

  importCategoriesFromText() {
    if (!this.importJsonText.trim()) return;
    this.processImportedJson(this.importJsonText);
  }

  processImportedJson(jsonStr: string) {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!Array.isArray(parsed)) {
        alert("Invalid format: JSON must be an array of categories");
        return;
      }
      const activeIds = new Set(this.devices.map(d => Number(d.id)));
      const imported: CustomCategory[] = [];
      for (const item of parsed) {
        if (!item || !item.name) continue;
        const rawIds = item.device_ids || item.deviceIds || [];
        const validIds = rawIds.map((x: any) => Number(x)).filter((id: number) => !isNaN(id) && activeIds.has(id));
        imported.push({
          id: item.id || 'cat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          name: String(item.name).trim(),
          color: item.color || '#4e9af1',
          icon: item.icon || 'fa-folder',
          device_ids: validIds
        });
      }
      if (imported.length === 0) {
        alert("No valid categories found in file");
        return;
      }
      this.customCategories = imported;
      this.persistCategories();
      this.buildTree();
      this.showCategoryModal = false;
      this.importJsonText = '';
    } catch (err: any) {
      alert("Error parsing JSON: " + err.message);
    }
  }

  // ─── Filter Toggle Helpers ───
  toggleFilterGroup(gid: number) {
    const idx = this.filterGroupIds.indexOf(gid);
    if (idx > -1) this.filterGroupIds.splice(idx, 1);
    else this.filterGroupIds.push(gid);
  }

  toggleFilterCategory(cid: string) {
    const idx = this.filterCategoryIds.indexOf(cid);
    if (idx > -1) this.filterCategoryIds.splice(idx, 1);
    else this.filterCategoryIds.push(cid);
  }

  toggleFilterType(type: string) {
    const idx = this.filterTypes.indexOf(type);
    if (idx > -1) this.filterTypes.splice(idx, 1);
    else this.filterTypes.push(type);
  }

  // ─── Favorites & Connections ───
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
    if (this.isApp(device)) {
      this.selectDevice(device, 'rdp');
      return;
    }
    const isWindows = device.device_type === 'windows' || device.brand === 'windows';
    const proto = device.protocol || (isWindows ? 'rdp' : (device.device_type === 'vnc' ? 'vnc' : 'ssh'));
    this.selectDevice(device, proto);
  }

  connectProtocol(device: any, protocol: string) {
    this.selectDevice(device, protocol);
  }
  
  hasProtocol(device: any, proto: string): boolean {
    if (!device) return false;
    if (device.connection_types && Array.isArray(device.connection_types) && device.connection_types.length > 0) {
      return device.connection_types.includes(proto);
    }
    if (device.protocols && Array.isArray(device.protocols) && device.protocols.length > 0) {
      return device.protocols.includes(proto);
    }
    if (device.protocol && device.protocol.toLowerCase() === proto.toLowerCase()) {
      return true;
    }

    const isWindows = device.device_type === 'windows' || device.brand === 'windows';

    if (proto === 'webfig' || proto === 'winbox' || proto === 'webbox') {
      return !isWindows && (!device.device_type || device.device_type === 'mikrotik' || device.brand === 'mikrotik');
    }
    
    if (proto === 'rdp') {
      return isWindows || device.protocol === 'rdp' || this.isApp(device);
    }
    if (proto === 'vnc') {
      return device.device_type === 'vnc' || device.protocol === 'vnc';
    }

    if (isWindows || this.isApp(device)) {
      return false;
    }

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
    this.closeContextMenu();
    const dev = { ...this.selectedDeviceForContext };
    dev.effective_ip = this.getEffectiveIp(dev);
    this.deviceSelected.emit({ device: dev, tool: tool });
  }

  openDeviceDetails() {
    this.closeContextMenu();
    if (!this.selectedDeviceForContext || this.isApp(this.selectedDeviceForContext)) return;
    window.open('#/device-stats;id=' + this.selectedDeviceForContext.id, '_blank');
  }
}
