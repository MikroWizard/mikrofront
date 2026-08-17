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
  public brandEditData: any = { brand: '', display_name: '', is_system: false };

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
    if (tab === 'templates') this.loadTemplates();
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

  get emptyTemplate() {
    return {
      display_name: '', brand: '', os_type: '', is_system: false,
      prompt: { login_pattern: '', password_pattern: '', patterns: [] },
      privilege_escalation: { command: '', password_prompt: '', success_pattern: '' },
      pagination: { enabled: false, key: '', prompt: '' },
      connection: { protocol: 'ssh', timeout: 30 },
      commands: { show_arp: '', show_config: '', show_interfaces: '', show_log: '', show_routing: '', show_version: '', save_config: '' },
      error_patterns: { patterns: [] },
      post_login_commands: [],
      pre_logout_commands: ['exit'],
    };
  }

  openCreateModal() {
    this.editData = JSON.parse(JSON.stringify(this.emptyTemplate));
    this.editModalVisible = true;
  }

  openEditModal(t: any) {
    const d: any = JSON.parse(JSON.stringify(t));
    d.is_system = !!t.is_system;
    d.prompt = d.prompt || { login_pattern: '', password_pattern: '', patterns: [] };
    d.privilege_escalation = d.privilege_escalation || { command: '', password_prompt: '', success_pattern: '' };
    d.pagination = d.pagination || { enabled: false, key: '', prompt: '' };
    d.connection = d.connection || { protocol: 'ssh', timeout: 30 };
    if (!d.connection.protocol && d.connection.protocols && d.connection.protocols.length) {
      d.connection.protocol = d.connection.protocols[0];
    }
    delete d.connection.protocols;
    delete d.connection.default_port_ssh;
    delete d.connection.default_port_telnet;
    d.commands = d.commands || {};
    d.error_patterns = d.error_patterns || { patterns: [] };
    d.post_login_commands = d.post_login_commands || [];
    d.pre_logout_commands = d.pre_logout_commands || ['exit'];
    this.editData = d;
    this.editModalVisible = true;
  }

  saveTemplate() {
    const data: any = JSON.parse(JSON.stringify(this.editData));
    const isNew = !data.id;
    const method = isNew ? 'createTemplate' : 'updateTemplate';
    this.data_provider[method](data).then((res: any) => {
      if (res.status === 'success' || res.id) {
        this.show_toast('Success', isNew ? 'Template created' : 'Template updated', 'success');
        this.editModalVisible = false;
        this.loadTemplates();
      } else {
        this.show_toast('Error', res.err || 'Failed to save', 'danger');
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
    this.editData.error_patterns.patterns.splice(i, 1);
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

  // ---- Brand CRUD ----

  openBrandCreateModal() {
    this.isEditingBrand = false;
    this.brandEditData = { brand: '', display_name: '', is_system: false };
    this.brandModalVisible = true;
  }

  openBrandEditModal(b: any) {
    this.isEditingBrand = true;
    this.brandEditData = {
      brand: b.brand,
      display_name: b.display_name,
      is_system: b.is_system,
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
      this.data_provider.createBrand({ brand: data.brand, display_name: data.display_name }).then((res: any) => {
        if (res.status === 'success') {
          this.show_toast('Success', 'Brand created', 'success');
          this.brandModalVisible = false;
          this.loadBrands();
        } else {
          this.show_toast('Error', res.err || 'Failed to create brand', 'danger');
        }
      });
    } else {
      this.data_provider.updateBrand({ brand: data.brand, display_name: data.display_name }).then((res: any) => {
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
