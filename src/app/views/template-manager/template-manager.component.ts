import { Component, OnInit, ViewChildren, QueryList } from '@angular/core';
import { dataProvider } from '../../providers/mikrowizard/data';
import { Router } from '@angular/router';
import { loginChecker } from '../../providers/login_checker';
import { formatInTimeZone } from 'date-fns-tz';
import { ToasterComponent } from '@coreui/angular';
import { AppToastComponent } from '../toast-simple/toast.component';

@Component({
  templateUrl: 'template-manager.component.html',
  styleUrls: ['template-manager.scss'],
})
export class TemplateManagerComponent implements OnInit {
  public uid: number = 0;
  public tz: string = '';
  public ispro: boolean = false;
  public loading: boolean = false;

  public activeTab: string = 'templates';

  public templates: any[] = [];
  public brands: any[] = [];
  public editModalVisible: boolean = false;
  public editData: any = JSON.parse(JSON.stringify(this.emptyTemplate));

  public brandModalVisible: boolean = false;
  public isEditingBrand: boolean = false;
  public brandEditData: any = { brand: '', display_name: '', is_active: true, is_system: false };

  // Advanced hooks JSON bindings
  public preConnectJson: string = '[]';
  public postDisconnectJson: string = '[]';

  // Diff Exclusions helpers & preview state
  public newDiffSectionName: string = '';
  public sampleDiffText: string = '';
  public previewResult: any = null;
  public showPreviewSandbox: boolean = false;

  @ViewChildren(ToasterComponent) viewChildren!: QueryList<ToasterComponent>;

  public toasterForm = {
    autohide: true, delay: 3000, position: 'fixed', fade: true, closeButton: true,
  };

  constructor(
    private data_provider: dataProvider,
    private router: Router,
    private login_checker: loginChecker
  ) {
    const _self = this;
    if (!this.login_checker.isLoggedIn()) {
      setTimeout(() => _self.router.navigate(['login']), 100);
    }
    this.data_provider.getSessionInfo().then((res) => {
      _self.uid = res.uid;
      _self.tz = res.tz;
      _self.ispro = res['ISPRO'];
      if (res.role !== 'admin' && res.role !== 'superuser') {
        setTimeout(() => _self.router.navigate(['/dashboard']), 100);
      }
    });
  }

  ngOnInit(): void {
    this.loadBrands();
    this.loadTemplates();
  }

  show_toast(title: string, body: string, color: string) {
    const props = { ...this.toasterForm, color, title, body };
    const ref = this.viewChildren.first.addToast(AppToastComponent, props, {});
    ref.instance['closeButton'] = props.closeButton;
  }

  switchTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'brands') this.loadBrands();
    else this.loadTemplates();
  }

  loadBrands() {
    this.data_provider.listBrands().then((res: any) => {
      this.brands = Array.isArray(res) ? res : (res.data || []);
    });
  }

  getProtoBadgeClass(proto: string): string {
    const p = (proto || 'ssh').toLowerCase();
    if (p === 'rdp') return 'bg-primary';
    if (p === 'vnc') return 'bg-warning text-dark';
    if (p === 'telnet') return 'bg-secondary';
    return 'bg-dark';
  }

  loadTemplates() {
    this.loading = true;
    this.data_provider.listTemplates({}).then((res: any) => {
      const all = res.data || res || [];
      if (this.activeTab === 'templates') {
        this.templates = all.filter((t: any) => {
          const p = (t.protocol || (t.connection && t.connection.protocol) || '').toLowerCase();
          return p !== 'rdp' && p !== 'vnc';
        });
      } else if (this.activeTab === 'rdp_templates') {
        this.templates = all.filter((t: any) => {
          const p = (t.protocol || (t.connection && t.connection.protocol) || '').toLowerCase();
          return p === 'rdp';
        });
      } else if (this.activeTab === 'vnc_templates') {
        this.templates = all.filter((t: any) => {
          const p = (t.protocol || (t.connection && t.connection.protocol) || '').toLowerCase();
          return p === 'vnc';
        });
      } else {
        this.templates = all;
      }
      this.loading = false;
    });
  }

  get emptyTemplate() {
    return {
      display_name: '', brand: '', os_type: '', is_system: false, is_active: true,
      prompt: { login_pattern: '', password_pattern: '', patterns: [] },
      privilege_escalation: { command: '', password_prompt: '', success_pattern: '' },
      pagination: { enabled: false, key: 'space', pattern: '--More--', prompt: '' },
      connection: { protocol: 'ssh', timeout: 30, default_port_ssh: 22, default_port_telnet: 23, ssh_interactive: true },
      commands: { show_arp: '', show_config: '', show_interfaces: '', show_log: '', show_routing: '', show_version: '', save_config: '' },
      config_mode: { enter: '', exit: '', save: '' },
      diff_exclusions: { global: [], show_config: [] },
      error_patterns: { patterns: [] },
      post_login_commands: [],
      pre_logout_commands: ['exit'],
      pre_connect: [],
      post_disconnect: [],
    };
  }

  openCreateModal() {
    this.editData = JSON.parse(JSON.stringify(this.emptyTemplate));
    this.preConnectJson = '[]';
    this.postDisconnectJson = '[]';
    this.sampleDiffText = '';
    this.previewResult = null;
    this.showPreviewSandbox = false;
    this.newDiffSectionName = '';

    if (this.activeTab === 'rdp_templates') {
      this.editData.display_name = 'Custom RDP Template';
      this.editData.brand = 'windows';
      this.editData.os_type = 'rdp-custom';
      this.editData.connection = {
        protocol: 'rdp',
        protocols: ['rdp'],
        port: 3389,
        security: 'any',
        ignore_cert: true,
        color_depth: 32,
        dpi: 96,
        enable_wallpaper: true,
        enable_theming: true,
        enable_font_smoothing: true,
        enable_full_window_drag: true,
        enable_desktop_composition: true,
        enable_menu_animations: false,
        disable_audio: false,
        server_layout: 'en-us-qwerty',
        timezone: 'UTC'
      };
    } else if (this.activeTab === 'vnc_templates') {
      this.editData.display_name = 'Custom VNC Template';
      this.editData.brand = 'generic';
      this.editData.os_type = 'vnc-custom';
      this.editData.connection = {
        protocol: 'vnc',
        protocols: ['vnc'],
        port: 5900,
        color_depth: 24,
        read_only: false
      };
    }
    this.editModalVisible = true;
  }

  openEditModal(t: any) {
    const d: any = JSON.parse(JSON.stringify(t));
    d.is_system = !!t.is_system;
    d.is_active = t.is_active !== undefined ? !!t.is_active : true;
    d.prompt = d.prompt || { login_pattern: '', password_pattern: '', patterns: [] };
    d.privilege_escalation = d.privilege_escalation || { command: '', password_prompt: '', success_pattern: '' };
    
    // Pagination defaults
    d.pagination = d.pagination || { enabled: false, key: 'space', pattern: '--More--', prompt: '' };
    if (d.pagination.pattern === undefined) d.pagination.pattern = '--More--';
    if (d.pagination.key === undefined) d.pagination.key = 'space';

    // Connection preservation
    d.connection = d.connection || { protocol: 'ssh', timeout: 30 };
    if (!d.connection.protocol && d.connection.protocols && d.connection.protocols.length) {
      d.connection.protocol = d.connection.protocols[0];
    }
    if (d.connection.default_port_ssh === undefined) d.connection.default_port_ssh = 22;
    if (d.connection.default_port_telnet === undefined) d.connection.default_port_telnet = 23;
    if (d.connection.ssh_interactive === undefined) d.connection.ssh_interactive = true;

    d.commands = d.commands || {};
    d.config_mode = d.config_mode || { enter: '', exit: '', save: '' };

    // Diff Exclusions normalization
    if (!d.diff_exclusions || typeof d.diff_exclusions !== 'object') {
      d.diff_exclusions = { global: [], show_config: [] };
    }
    if (typeof d.diff_exclusions === 'string') {
      try {
        d.diff_exclusions = JSON.parse(d.diff_exclusions);
      } catch (e) {
        d.diff_exclusions = { global: [], show_config: [] };
      }
    }
    if (!d.diff_exclusions.global) d.diff_exclusions.global = [];
    if (!d.diff_exclusions.show_config) d.diff_exclusions.show_config = [];
    for (const k of Object.keys(d.diff_exclusions)) {
      if (!Array.isArray(d.diff_exclusions[k])) {
        d.diff_exclusions[k] = [];
      } else {
        d.diff_exclusions[k] = d.diff_exclusions[k].map((item: any) => {
          if (typeof item === 'string') return { pattern: item, flags: '' };
          return { pattern: item?.pattern || '', flags: item?.flags || '' };
        });
      }
    }

    d.error_patterns = d.error_patterns || { patterns: [] };
    d.post_login_commands = d.post_login_commands || [];
    d.pre_logout_commands = d.pre_logout_commands || ['exit'];

    // Pre/Post hooks
    d.pre_connect = d.pre_connect || [];
    d.post_disconnect = d.post_disconnect || [];
    this.preConnectJson = JSON.stringify(d.pre_connect, null, 2);
    this.postDisconnectJson = JSON.stringify(d.post_disconnect, null, 2);

    this.sampleDiffText = '';
    this.previewResult = null;
    this.showPreviewSandbox = false;
    this.newDiffSectionName = '';

    this.editData = d;
    this.editModalVisible = true;
  }

  saveTemplate() {
    const data: any = JSON.parse(JSON.stringify(this.editData));

    // Parse pre_connect and post_disconnect JSON hooks
    try {
      data.pre_connect = this.preConnectJson ? JSON.parse(this.preConnectJson) : [];
    } catch (e) {
      this.show_toast('Error', 'Invalid JSON syntax in Pre-Connect hooks', 'danger');
      return;
    }
    try {
      data.post_disconnect = this.postDisconnectJson ? JSON.parse(this.postDisconnectJson) : [];
    } catch (e) {
      this.show_toast('Error', 'Invalid JSON syntax in Post-Disconnect hooks', 'danger');
      return;
    }

    // Clean up Diff Exclusions
    if (data.diff_exclusions) {
      const cleanExcl: any = {};
      for (const sec of Object.keys(data.diff_exclusions)) {
        const rules = (data.diff_exclusions[sec] || []).filter((r: any) => r && r.pattern && r.pattern.trim().length > 0);
        if (rules.length > 0 || sec === 'global' || sec === 'show_config') {
          cleanExcl[sec] = rules.map((r: any) => ({
            pattern: r.pattern.trim(),
            flags: (r.flags || '').trim()
          }));
        }
      }
      data.diff_exclusions = cleanExcl;
    }

    // Clean up config_mode
    if (data.config_mode) {
      if (!data.config_mode.enter && !data.config_mode.exit && !data.config_mode.save) {
        data.config_mode = null;
      }
    }

    // Clean up privilege_escalation
    if (data.privilege_escalation) {
      if (!data.privilege_escalation.command && !data.privilege_escalation.password_prompt && !data.privilege_escalation.success_pattern) {
        data.privilege_escalation = null;
      }
    }

    const isNew = !data.id;
    const method = isNew ? 'createTemplate' : 'updateTemplate';
    this.data_provider[method](data).then((res: any) => {
      if (res.status === 'success' || res.id) {
        this.show_toast('Success', isNew ? 'Template created' : 'Template updated', 'success');
        this.editModalVisible = false;
        this.loadTemplates();
      } else {
        this.show_toast('Error', res.err || 'Failed to save template', 'danger');
      }
    });
  }

  deleteTemplate(id: number) {
    if (!confirm('Delete this template?')) return;
    this.data_provider.deleteTemplate(id).then((res: any) => {
      if (res.status === 'success') {
        this.show_toast('Success', 'Template deleted', 'success');
        this.loadTemplates();
      } else {
        this.show_toast('Error', res.err || 'Failed to delete', 'danger');
      }
    });
  }

  getBrandName(brand: string): string {
    const b = this.brands.find((x: any) => (x.brand || x.id) === brand);
    return b ? (b.display_name || b.name) : brand;
  }

  addPromptPattern(): void {
    if (!this.editData.prompt.patterns) this.editData.prompt.patterns = [];
    this.editData.prompt.patterns.push('');
  }

  removePromptPattern(i: number): void {
    this.editData.prompt.patterns.splice(i, 1);
  }

  addErrorPattern(): void {
    if (!this.editData.error_patterns.patterns) this.editData.error_patterns.patterns = [];
    this.editData.error_patterns.patterns.push('');
  }

  removeErrorPattern(i: number): void {
    if (this.editData.error_patterns && this.editData.error_patterns.patterns) {
      this.editData.error_patterns.patterns.splice(i, 1);
    }
  }

  addPostLoginCommand(): void {
    this.editData.post_login_commands.push('');
  }

  removePostLoginCommand(i: number): void {
    this.editData.post_login_commands.splice(i, 1);
  }

  addPreLogoutCommand(): void {
    this.editData.pre_logout_commands.push('');
  }

  removePreLogoutCommand(i: number): void {
    this.editData.pre_logout_commands.splice(i, 1);
  }

  // ---- Diff Exclusions Helpers ----

  getDiffExclusionSections(): string[] {
    if (!this.editData || !this.editData.diff_exclusions) return [];
    return Object.keys(this.editData.diff_exclusions);
  }

  getDiffExclusionCount(exclusions: any): number {
    if (!exclusions || typeof exclusions !== 'object') return 0;
    let count = 0;
    for (const sec of Object.keys(exclusions)) {
      if (Array.isArray(exclusions[sec])) {
        count += exclusions[sec].length;
      }
    }
    return count;
  }

  addDiffExclusionSection(sectionName?: string) {
    const name = (sectionName || this.newDiffSectionName || '').trim();
    if (!name) return;
    if (!this.editData.diff_exclusions) {
      this.editData.diff_exclusions = {};
    }
    if (!this.editData.diff_exclusions[name]) {
      this.editData.diff_exclusions[name] = [];
    }
    this.newDiffSectionName = '';
  }

  removeDiffExclusionSection(sec: string) {
    if (this.editData.diff_exclusions && this.editData.diff_exclusions[sec]) {
      delete this.editData.diff_exclusions[sec];
    }
  }

  addDiffExclusionRule(sec: string) {
    if (!this.editData.diff_exclusions[sec]) {
      this.editData.diff_exclusions[sec] = [];
    }
    this.editData.diff_exclusions[sec].push({ pattern: '', flags: '' });
  }

  removeDiffExclusionRule(sec: string, index: number) {
    if (this.editData.diff_exclusions[sec]) {
      this.editData.diff_exclusions[sec].splice(index, 1);
    }
  }

  testDiffExclusions() {
    if (!this.sampleDiffText) {
      this.previewResult = null;
      return;
    }
    try {
      const lines = this.sampleDiffText.split('\n');
      const kept: string[] = [];
      const removed: string[] = [];

      const compiledRules: { regex: RegExp; section: string; pattern: string }[] = [];
      for (const sec of Object.keys(this.editData.diff_exclusions || {})) {
        const rules = this.editData.diff_exclusions[sec] || [];
        for (const r of rules) {
          if (r && r.pattern && r.pattern.trim()) {
            try {
              const flags = (r.flags || '').replace(/[^ims]/g, '');
              compiledRules.push({ regex: new RegExp(r.pattern, flags), section: sec, pattern: r.pattern });
            } catch (e) {
              // Ignore invalid regex in client preview
            }
          }
        }
      }

      for (const line of lines) {
        let matched = false;
        const stripped = line.replace(/[\r\n]+$/, '');
        for (const r of compiledRules) {
          if (r.regex.test(stripped)) {
            matched = true;
            removed.push(line);
            break;
          }
        }
        if (!matched) {
          kept.push(line);
        }
      }

      this.previewResult = {
        total_lines: lines.length,
        lines_removed: removed.length,
        lines_kept: kept.length,
        cleaned: kept.join('\n'),
        removed_samples: removed.slice(0, 10)
      };
    } catch (err: any) {
      this.show_toast('Regex Error', err.message || 'Error executing regex preview', 'danger');
    }
  }

  // ---- Brand CRUD ----

  openBrandCreateModal() {
    this.isEditingBrand = false;
    this.brandEditData = { brand: '', display_name: '', is_active: true, is_system: false };
    this.brandModalVisible = true;
  }

  openBrandEditModal(b: any) {
    this.isEditingBrand = true;
    this.brandEditData = {
      brand: b.brand,
      display_name: b.display_name,
      is_active: b.is_active !== undefined ? !!b.is_active : true,
      is_system: b.is_system,
      created: b.created
    };
    this.brandModalVisible = true;
  }

  saveBrand() {
    const data = this.brandEditData;
    if (data.is_system) {
      this.show_toast('Warning', 'System brands cannot be modified', 'warning');
      return;
    }
    if (!data.brand || !data.display_name) {
      this.show_toast('Error', 'Brand slug and display name required', 'warning');
      return;
    }
    if (!this.isEditingBrand) {
      this.data_provider.createBrand({ brand: data.brand, display_name: data.display_name, is_active: data.is_active }).then((res: any) => {
        if (res.status === 'success') {
          this.show_toast('Success', 'Brand created', 'success');
          this.brandModalVisible = false;
          this.loadBrands();
        } else {
          this.show_toast('Error', res.err || 'Failed to create brand', 'danger');
        }
      });
    } else {
      this.data_provider.updateBrand({ brand: data.brand, display_name: data.display_name, is_active: data.is_active }).then((res: any) => {
        if (res.status === 'success') {
          this.show_toast('Success', 'Brand updated', 'success');
          this.brandModalVisible = false;
          this.loadBrands();
        } else {
          this.show_toast('Error', res.err || 'Failed to update brand', 'danger');
        }
      });
    }
  }

  deleteBrand(brand: string, system: boolean) {
    if (system) {
      this.show_toast('Warning', 'System brands cannot be deleted', 'warning');
      return;
    }
    if (!confirm(`Delete brand "${brand}"? This cannot be undone.`)) return;
    this.data_provider.deleteBrand(brand).then((res: any) => {
      if (res.status === 'success') {
        this.show_toast('Success', 'Brand deleted', 'success');
        this.loadBrands();
      } else {
        this.show_toast('Error', res.err || 'Failed to delete brand', 'danger');
      }
    });
  }
}

