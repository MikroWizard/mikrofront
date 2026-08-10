import { Component, OnInit, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { Table } from 'primeng/table';
import { dataProvider } from '../../providers/mikrowizard/data';
import { Router } from '@angular/router';
import { loginChecker } from '../../providers/login_checker';

import { ToasterComponent } from '@coreui/angular';
import { AppToastComponent } from '../toast-simple/toast.component';

@Component({
  templateUrl: 'policy-manager.component.html',
  styleUrls: ['policy-manager.scss'],
})
export class PolicyManagerComponent implements OnInit {
  public uid: number = 0;
  public uname: string = '';
  public ispro: boolean = false;
  public tz: string = '';

  public activeTab: string = 'policies';

  public policies: any[] = [];
  public loading: boolean = false;

  public expansions: any[] = [];
  public loadingExpansions: boolean = false;
  public expEditDialogVisible: boolean = false;
  public editExpansion: any = { brand: 'generic', expansion_type: 'shorthand', shorthand: '', full_command: '', is_enabled: true, is_default: false };
  public expEditMode: string = 'create';

  public editDialogVisible: boolean = false;
  public editMode: string = 'create';
  public editPolicy: any = { name: '', description: '', policy_type: 'blacklist', matching: 'token', default_action: 'allow', rules: [], autoExecCommands: '', defense_level: 'standard', blocked_binaries: [], blockedBinariesText: '', agent_modes: {linux: 'none', darwin: 'none', freebsd: 'none'} };

  public deleteConfirmVisible: boolean = false;
  public deleteTarget: any = null;

  // Brand support
  public brands: any[] = [];
  public brandFilter: string = '';

  public toasterForm = {
    autohide: true,
    delay: 3000,
    position: 'fixed',
    fade: true,
    closeButton: true,
  };

  @ViewChild('dt') dt: Table | undefined;
  @ViewChild('expDt') expDt: Table | undefined;
  @ViewChildren(ToasterComponent) viewChildren!: QueryList<ToasterComponent>;

  public expBrandFilter: string = '';

  constructor(
    private data_provider: dataProvider,
    private router: Router,
    private login_checker: loginChecker
  ) {
    var _self = this;
    if (!this.login_checker.isLoggedIn()) {
      setTimeout(function () { _self.router.navigate(['login']); }, 100);
    }
    this.data_provider.getSessionInfo().then((res) => {
      _self.uid = res.uid;
      _self.uname = res.name;
      _self.tz = res.tz;
      _self.ispro = res['ISPRO'];
      if (res.role != 'admin' && res.role != 'superuser') {
        setTimeout(function () { _self.router.navigate(['/dashboard']); }, 100);
      }
    });
  }

  ngOnInit(): void {
    this.loadPolicies();
    this.loadExpansions();
    this.loadBrands();
  }

  show_toast(title: string, body: string, color: string) {
    const { ...props } = { ...this.toasterForm, color, title, body };
    const componentRef = this.viewChildren.first.addToast(AppToastComponent, props, {});
    componentRef.instance['closeButton'] = props.closeButton;
  }

  loadBrands() {
    const _self = this;
    _self.data_provider.getDeviceBrands().then((res: any) => {
      if (Array.isArray(res)) {
        _self.brands = res.filter((b: any) => b.is_active !== false);
      } else if (res && Array.isArray(res.data)) {
        _self.brands = res.data.filter((b: any) => b.is_active !== false);
      }
    });
  }

  loadPolicies() {
    const _self = this;
    _self.loading = true;
    _self.data_provider.listPolicies().then((res: any) => {
      if (res.status === 'success') {
        _self.policies = res.data || [];
      }
      _self.loading = false;
    });
  }

  loadExpansions() {
    const _self = this;
    _self.loadingExpansions = true;
    _self.data_provider.MikroWizardRPC.sendJsonRequest('/api/policy/expansions/list', {}).then((res: any) => {
      if (res.status === 'success') {
        _self.expansions = res.data || [];
      }
      _self.loadingExpansions = false;
    });
  }

  getBrandCoverage(policy: any): string[] {
    const brands = new Set<string>();
    for (const r of (policy.rules || [])) {
      if (r.brand) {
        brands.add(r.brand);
      }
    }
    return Array.from(brands);
  }

  hasAllBrands(policy: any): boolean {
    return (policy.rules || []).some((r: any) => !r.brand);
  }

  openCreateDialog() {
    this.editMode = 'create';
    this.editPolicy = { name: '', description: '', policy_type: 'blacklist', matching: 'token', default_action: 'allow', rules: [], autoExecCommands: '', defense_level: 'standard', blocked_binaries: [], blockedBinariesText: '', agent_modes: {linux: 'none', darwin: 'none', freebsd: 'none'} };
    this.editDialogVisible = true;
  }

  openEditDialog(policy: any) {
    this.editMode = 'edit';
    const _self = this;
    _self.data_provider.getPolicy(policy.id).then((res: any) => {
      if (res.status === 'success') {
        _self.editPolicy = res.data || { name: '', description: '', policy_type: 'blacklist', matching: 'token', default_action: 'allow', rules: [], defense_level: 'standard', blocked_binaries: [], agent_modes: {linux: 'none', darwin: 'none', freebsd: 'none'} };
        _self.editPolicy.autoExecCommands = _self.editPolicy.policy_type === 'auto_exec'
          ? (_self.editPolicy.rules || []).map((r: any) => r.rule).join('\n')
          : '';
        _self.editPolicy.blockedBinariesText = (_self.editPolicy.blocked_binaries || []).join(', ');
        _self.editDialogVisible = true;
      }
    });
  }

  savePolicy() {
    const _self = this;
    const data: any = { ..._self.editPolicy };
    if (data.policy_type === 'auto_exec') {
      data.rules = (data.autoExecCommands || '').split('\n')
        .filter((l: string) => l.trim())
        .map((l: string) => ({ id: crypto.randomUUID(), rule: l.trim() }));
      data.matching = 'token';
      data.default_action = 'allow';
    }
    delete data.autoExecCommands;
    data.blocked_binaries = (data.blockedBinariesText || '')
      .split(',').map((s: string) => s.trim()).filter((s: string) => s);
    delete data.blockedBinariesText;
    data.default_action = data.policy_type === 'whitelist' ? 'deny' : 'allow';
    if (this.editMode === 'create') {
      _self.data_provider.createPolicy(data).then((res: any) => {
        if (res.status === 'success') {
          _self.show_toast('Success', 'Policy created', 'success');
          _self.editDialogVisible = false;
          _self.loadPolicies();
        }
      });
    } else {
      _self.data_provider.updatePolicy(data).then((res: any) => {
        if (res.status === 'success') {
          _self.show_toast('Success', 'Policy updated', 'success');
          _self.editDialogVisible = false;
          _self.loadPolicies();
        }
      });
    }
  }

  confirmDelete(item: any) {
    this.deleteTarget = item;
    this.deleteConfirmVisible = true;
  }

  executeDelete() {
    if (!this.deleteTarget) return;
    const _self = this;
    _self.data_provider.MikroWizardRPC.sendJsonRequest('/api/policy/delete', { id: _self.deleteTarget.id }).then((res: any) => {
      if (res.status === 'success') {
        _self.show_toast('Deleted', 'Policy deleted successfully', 'success');
        _self.loadPolicies();
      } else {
        _self.show_toast('Error', res.error || 'Failed to delete policy', 'danger');
      }
      _self.deleteConfirmVisible = false;
      _self.deleteTarget = null;
    });
  }

  // --- Command Expansions Methods ---

  openExpCreateDialog() {
    this.expEditMode = 'create';
    this.editExpansion = { brand: 'generic', expansion_type: 'shorthand', shorthand: '', full_command: '', is_enabled: true, is_default: false };
    this.expEditDialogVisible = true;
  }

  openExpEditDialog(item: any) {
    this.expEditMode = 'edit';
    this.editExpansion = JSON.parse(JSON.stringify(item));
    this.expEditDialogVisible = true;
  }

  saveExpansion() {
    const _self = this;
    _self.data_provider.MikroWizardRPC.sendJsonRequest('/api/policy/expansions/save', _self.editExpansion).then((res: any) => {
      if (res.status === 'success') {
        _self.show_toast('Success', 'Expansion saved', 'success');
        _self.expEditDialogVisible = false;
        _self.loadExpansions();
      } else {
        _self.show_toast('Error', res.error || 'Failed to save expansion', 'danger');
      }
    });
  }

  deleteExpansion(item: any) {
    if (item.is_default) {
      this.show_toast('Error', 'Cannot delete default expansions. Disable it instead.', 'danger');
      return;
    }
    if (!confirm('Are you sure you want to delete this expansion?')) return;
    const _self = this;
    _self.data_provider.MikroWizardRPC.sendJsonRequest('/api/policy/expansions/delete', { id: item.id }).then((res: any) => {
      if (res.status === 'success') {
        _self.show_toast('Deleted', 'Expansion deleted', 'success');
        _self.loadExpansions();
      } else {
        _self.show_toast('Error', res.error || 'Failed to delete expansion', 'danger');
      }
    });
  }

  toggleExpansionState(item: any) {
    const newVal = !item.is_enabled;
    this.data_provider.MikroWizardRPC.sendJsonRequest('/api/policy/expansions/save', { id: item.id, is_enabled: newVal }).then((res: any) => {
      if (res.status === 'success') {
        item.is_enabled = newVal;
        this.show_toast('Success', newVal ? 'Enabled' : 'Disabled', 'success');
      } else {
        this.show_toast('Error', res.error, 'danger');
      }
    });
  }

  addRule() {
    if (!this.editPolicy.rules) this.editPolicy.rules = [];
    this.editPolicy.rules.push({ id: crypto.randomUUID(), rule: '', brand: '' });
  }

  removeRule(index: number) {
    this.editPolicy.rules.splice(index, 1);
  }

  setRuleBrand(rule: any, brand: string) {
    rule.brand = brand;
  }

  filteredEditRules(): any[] {
    if (!this.brandFilter) return this.editPolicy.rules || [];
    return (this.editPolicy.rules || []).filter((r: any) => !r.brand || r.brand === this.brandFilter);
  }

  applyFilterGlobal($event: any, stringVal: string) {
    this.dt!.filterGlobal(($event.target as HTMLInputElement).value, stringVal);
  }

  applyExpFilterGlobal($event: any, stringVal: string) {
    this.expDt!.filterGlobal(($event.target as HTMLInputElement).value, stringVal);
  }

  filterExpByBrand() {
    if (this.expDt) {
      if (this.expBrandFilter) {
        this.expDt.filter(this.expBrandFilter, 'brand', 'equals');
      } else {
        this.expDt.filter('', 'brand', 'equals');
      }
    }
  }

  openPolicyAIHelp() {
    const policyType = this.editPolicy.policy_type || 'whitelist/blacklist';
    const matchingType = this.editPolicy.matching || 'regex';
    const rules = (this.editPolicy.rules || []).map((r: any) => r.rule).join('\n  - ');
    const currentRules = rules ? `\n### My Current Rules:\n  - ${rules}` : '';

    const prompt = `I need help creating rules for a Terminal Access Policy that controls SSH/telnet commands via a terminal gateway.

### Policy Type: ${policyType}
- **Blacklist** = deny commands matching rules, allow everything else
- **Whitelist** = allow commands matching rules, deny everything else
- **Auto-Execute** = non-interactive session that runs predefined commands

### Matching Mode: ${matchingType}
- **token** = exact word match (case-insensitive, whole word)
- **regex** = Python regex pattern (re module syntax)${currentRules}

### Example Rules:
- "show version" (token — blocks/allows the exact command "show version")
- "\\\\/interface\\\\b" (regex — matches any command containing the word "interface")
- "^(show|display) " (regex — matches commands starting with "show " or "display ")

Please provide suggested rules for my policy based on the above context.`;

    const encodedPrompt = encodeURIComponent(prompt);
    window.open(`https://chatgpt.com/?q=${encodedPrompt}`, '_blank');
  }

  getDefenseBadgeColor(level: string): string {
    return level === 'strict' ? 'danger' : level === 'standard' ? 'info' : level === 'relaxed' ? 'secondary' : 'warning';
  }

  trackByIndex(index: number): number {
    return index;
  }

  getRuleCount(policy: any): number {
    return (policy.rules || []).length;
  }

}
