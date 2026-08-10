import { Component, OnInit, ViewEncapsulation, ViewChildren, QueryList } from '@angular/core';
import { ToasterComponent } from '@coreui/angular';
import { AppToastComponent } from '../toast-simple/toast.component';
import { dataProvider } from '../../providers/mikrowizard/data';
import { Router } from '@angular/router';
import { loginChecker } from '../../providers/login_checker';

@Component({
  templateUrl: 'alerts.component.html',
  styleUrls: ['alerts.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AlertsComponent implements OnInit {
  public activeTab: string = 'rules';
  public loading: boolean = true;
  public isAdmin: boolean = false;
  public myUid: number = -1;
  
  @ViewChildren(ToasterComponent) viewChildren!: QueryList<ToasterComponent>;
  toasterForm = {
    placement: 'top-end',
    delay: 5000,
  };
  
  show_toast(title: string, body: string, color: string) {
    const { ...props } = { ...this.toasterForm, color, title, body };
    if (this.viewChildren && this.viewChildren.first) {
      this.viewChildren.first.addToast(AppToastComponent, props);
    }
  }
  
  // Rules State
  public rules: any[] = [];
  public showRuleModal: boolean = false;
  public ruleForm: any = {};
  public ruleFilterRole: string = 'all';
  public ruleFilterSearch: string = '';
  
  get filteredRules() {
    if (!this.rules) return [];
    if (!this.isAdmin) return this.rules;

    return this.rules.filter(rule => {
      if (this.ruleFilterRole === 'all' && !this.ruleFilterSearch) return true;
      
      const recs = rule.recipients || [];
      const hasMatchingUser = recs.some((rec: any) => {
        const u = this.users.find(u => u.id == rec.user_id);
        if (!u) return false;
        
        let roleMatches = true;
        if (this.ruleFilterRole === 'staff') {
          roleMatches = ['admin', 'staff', 'superuser'].includes(u.role);
        } else if (this.ruleFilterRole === 'customer') {
          roleMatches = u.role === 'customer';
        }
        let userMatches = true;
        if (this.ruleFilterSearch && this.ruleFilterSearch.trim() !== '') {
          const search = this.ruleFilterSearch.toLowerCase().trim();
          const nameMatch = u.name ? u.name.toLowerCase().includes(search) : false;
          const userMatch = u.username ? u.username.toLowerCase().includes(search) : false;
          userMatches = nameMatch || userMatch;
        }
        
        return roleMatches && userMatches;
      });
      
      return hasMatchingUser;
    });
  }
  
  // Channels State
  public channels: any[] = [];
  public showChannelModal: boolean = false;
  public channelForm: any = {};
  public channelServices: any[] = [];
  
  // Log State
  public dispatchLogs: any[] = [];
  public eventModalVisible: boolean = false;
  public selectedEventDetails: any = null;

  public instructionModalVisible: boolean = false;
  public selectedChannelForInstruction: any = null;
  public parsedChannelFields: any = {};

  openInstructionModal(ch: any) {
    this.selectedChannelForInstruction = ch;
    try {
      this.parsedChannelFields = JSON.parse(ch.identifier || '{}');
    } catch {
      this.parsedChannelFields = {};
    }
    this.instructionModalVisible = true;
  }

  viewEventDetails(log: any) {
    this.selectedEventDetails = log.event_snap;
    this.eventModalVisible = true;
  }

  // Dropdown data
  public eventTypes = ['syslog', 'link_up', 'link_down', 'connection', 'config', 'health', 'state', 'firmware'];
  public severities = ['info', 'warning', 'error', 'critical'];
  public devgroups: any[] = [];
  public devices: any[] = [];
  public users: any[] = [];
  
  constructor(
    private data_provider: dataProvider,
    private router: Router,
    private login_checker: loginChecker
  ) {
    if (!this.login_checker.isLoggedIn()) {
      setTimeout(() => this.router.navigate(['login']), 100);
    }
    this.data_provider.getSessionInfo().then((res: any) => {
      this.isAdmin = res.role === 'admin';
      this.myUid = res.id;
      if (!res.ISPRO) {
         setTimeout(() => this.router.navigate(['/user/dashboard']), 100);
         return;
      }
      
      this.loadDropdownData();
      this.loadData();
    });
  }

  ngOnInit() {
  }
  
  switchTab(tab: string) {
    this.activeTab = tab;
    this.loadData();
  }

  loadDropdownData() {
    this.data_provider.get_devgroup_list().then((res: any) => {
      const data = res.result || res;
      if (Array.isArray(data)) this.devgroups = data;
    });
    this.data_provider.get_devices("").then((res: any) => {
      const data = res.result || res;
      if (Array.isArray(data)) this.devices = data;
    });
    if (this.isAdmin) {
      this.data_provider.get_users(1, 1000, "").then((res: any) => {
        const data = res.result || res;
        if (Array.isArray(data)) this.users = data;
      });
    }
  }
  
  loadData() {
    this.loading = true;
    if (this.activeTab === 'rules') {
      this.data_provider.alerts_list().then((res: any) => {
        this.rules = res.rules || [];
        this.loading = false;
      });
    } else if (this.activeTab === 'channels') {
      this.data_provider.alert_channels_list().then((res: any) => {
        this.channels = res.channels || [];
        this.loading = false;
      });
      this.data_provider.alerts_options().then((res: any) => {
         this.channelServices = res.enabled_services || [];
      });
    } else if (this.activeTab === 'logs') {
      this.data_provider.alerts_history(200).then((res: any) => {
        this.dispatchLogs = res.history || [];
        this.loading = false;
      });
    }
  }
  
  getGlobalConfigValue(channelType: string, key: string): string | null {
    const svc = this.channelServices.find(s => s.id === channelType);
    if (!svc) return null;
    const field = svc.fields.find((f: any) => f.is_global && f.key === key);
    return field ? field.value : null;
  }
  
  // ---- Rule Methods ----
  openRuleModal(rule: any = null) {
    if (rule) {
      this.ruleForm = JSON.parse(JSON.stringify(rule));
      if (!Array.isArray(this.ruleForm.event_types)) this.ruleForm.event_types = [];
      if (!Array.isArray(this.ruleForm.event_levels)) this.ruleForm.event_levels = [];
      if (!this.isAdmin) this.ruleForm.scope = 'devices';
      else if (!this.ruleForm.scope) this.ruleForm.scope = 'global';
    } else {
      this.ruleForm = {
        name: '',
        scope: this.isAdmin ? 'global' : 'devices',
        target_id: null,
        target_ids: [],
        event_types: [],
        event_levels: [],
        event_srcs: [],
        event_details: '',
        recipient_custom: '',
        apprise_urls: [],
        cooldown_sec: 0,
        enabled: true,
        recipients: []
      };
    }
    this.syncSelectedTargets();
    this.syncSelectedRecipients();
    this.showRuleModal = true;
  }
  
  // ---- Selection Modal Logic ----
  public deviceSelectModalVisible = false;
  public groupSelectModalVisible = false;
  public recipientSelectModalVisible = false;
  public selectedDevices: any[] = [];
  public selectedGroups: any[] = [];
  public selectedRecipients: any[] = [];
  public userRoleFilter: string = 'all';
  
  setRoleFilter(filter: string) {
    this.userRoleFilter = filter;
  }
  
  get filteredUsers() {
    let list = this.users;
    
    if (this.userRoleFilter === 'staff') {
      list = list.filter(u => u.role !== 'customer' && u.role !== 'customer_inactive');
    } else if (this.userRoleFilter === 'customers') {
      list = list.filter(u => u.role === 'customer' || u.role === 'customer_inactive');
    }
    
    return list;
  }
  
  openDeviceSelectModal() {
    this.deviceSelectModalVisible = true;
  }
  
  openGroupSelectModal() {
    this.groupSelectModalVisible = true;
  }
  
  syncSelectedTargets() {
    if (this.ruleForm.scope === 'devices') {
       this.selectedDevices = this.devices.filter(d => this.ruleForm.target_ids?.includes(d.id));
    } else if (this.ruleForm.scope === 'groups') {
       this.selectedGroups = this.devgroups.filter(g => this.ruleForm.target_ids?.includes(g.id));
    } else if (this.ruleForm.scope === 'device') {
       this.selectedDevices = this.devices.filter(d => d.id === this.ruleForm.target_id);
    } else if (this.ruleForm.scope === 'group') {
       this.selectedGroups = this.devgroups.filter(g => g.id === this.ruleForm.target_id);
    }
  }

  syncSelectedRecipients() {
    this.selectedRecipients = [];
    if (this.ruleForm.recipients && Array.isArray(this.ruleForm.recipients)) {
      const userIds = this.ruleForm.recipients.map((r: any) => r.user_id);
      this.selectedRecipients = this.users.filter(u => userIds.includes(u.id));
    }
  }

  openRecipientSelectModal() {
    this.userRoleFilter = 'all';
    this.recipientSelectModalVisible = true;
  }
  
  confirmRecipientSelection() {
    this.recipientSelectModalVisible = false;
  }

  confirmDeviceSelection() {
    if (this.ruleForm.scope === 'device') {
      if (this.selectedDevices.length > 0) {
        this.ruleForm.target_id = this.selectedDevices[0].id;
      } else {
        this.ruleForm.target_id = null;
      }
    }
    this.deviceSelectModalVisible = false;
  }

  confirmGroupSelection() {
    if (this.ruleForm.scope === 'group') {
      if (this.selectedGroups.length > 0) {
        this.ruleForm.target_id = this.selectedGroups[0].id;
      } else {
        this.ruleForm.target_id = null;
      }
    }
    this.groupSelectModalVisible = false;
  }
  
  applyFilterDevices($event: any, stringVal: string, dt: any) {
    dt.filterGlobal(($event.target as HTMLInputElement).value, stringVal);
  }
  
  applyFilterGroups($event: any, stringVal: string, dt: any) {
    dt.filterGlobal(($event.target as HTMLInputElement).value, stringVal);
  }
  
  applyFilterUsers($event: any, stringVal: string, dt: any) {
    dt.filterGlobal(($event.target as HTMLInputElement).value, stringVal);
  }
  
  toggleArrayItem(arrName: string, val: string) {
    if (!this.ruleForm[arrName]) this.ruleForm[arrName] = [];
    const idx = this.ruleForm[arrName].indexOf(val);
    if (idx > -1) this.ruleForm[arrName].splice(idx, 1);
    else this.ruleForm[arrName].push(val);
  }
  
  get event_srcs_str() {
    return this.ruleForm.event_srcs ? this.ruleForm.event_srcs.join(', ') : '';
  }
  set event_srcs_str(val: string) {
    this.ruleForm.event_srcs = val ? val.split(',').map(s => s.trim()).filter(s => s) : [];
  }
  
  saveRule() {
    // Clear target_id if scope is global
    if (this.ruleForm.scope === 'global') this.ruleForm.target_id = null;
    if (this.ruleForm.scope === 'devices') this.ruleForm.target_ids = this.selectedDevices.map((d: any) => d.id);
    if (this.ruleForm.scope === 'groups') this.ruleForm.target_ids = this.selectedGroups.map((g: any) => g.id);
    
    this.ruleForm.recipients = this.selectedRecipients.map(u => ({user_id: u.id, channel_types: ['all']}));
    
    this.data_provider.alerts_save(this.ruleForm).then((res: any) => {
      if (res && res.error) {
        this.show_toast("Error", res.error, "danger");
        return;
      }
      this.show_toast("Success", "Rule saved successfully.", "success");
      this.showRuleModal = false;
      this.loadData();
    }).catch(e => {
      const msg = e?.error?.error || e?.error?.err || e?.error || e?.message || (typeof e === 'string' ? e : "Unknown error");
      const finalMsg = typeof msg === 'object' ? JSON.stringify(msg) : msg;
      this.show_toast("Error", "Error saving rule: " + finalMsg, "danger");
    });
  }

  openAIHelp() {
    const currentInput = this.ruleForm.event_details || '';
    const detailsClause = currentInput 
       ? `I have started writing this regex: "${currentInput}". Please fix or complete it for my event.` 
       : `Here is the event I want to match (e.g. "login failed", "IPsec down") or a sample syslog message:\n[REPLACE THIS TEXT WITH YOUR DESIRED EVENT OR A SAMPLE SYSLOG MESSAGE]`;

    const prompt = `I am using Mikrotik routers and receiving syslog messages.
I need a Python regular expression (re.search compatible) to filter these syslogs for an Alert Rule.

${detailsClause}

Please provide only the raw Python regex pattern that I can use.`;

    const encodedPrompt = encodeURIComponent(prompt);
    window.open(`https://chatgpt.com/?q=${encodedPrompt}`, '_blank');
  }
  
  deleteRule(id: number) {
    if(confirm('Are you sure you want to delete this rule?')) {
      this.data_provider.alerts_delete(id).then((res: any) => {
        if (res && res.error) {
          this.show_toast("Error", res.error, "danger");
          return;
        }
        this.show_toast("Success", "Rule deleted successfully.", "success");
        this.loadData();
      }).catch(e => {
        const msg = e?.error?.error || e?.error?.err || e?.error || e?.message || (typeof e === 'string' ? e : "Unknown error");
        const finalMsg = typeof msg === 'object' ? JSON.stringify(msg) : msg;
        this.show_toast("Error", "Error deleting rule: " + finalMsg, "danger");
      });
    }
  }

  getDevName(dev_id: number) {
     const d = this.devices.find(x => x.id === dev_id);
     return d ? d.name : 'Any';
  }

  getGroupName(gid: number) {
     const g = this.devgroups.find(x => x.id === gid);
     return g ? g.name : 'Any';
  }
  
  // ---- Channel Methods ----
  channelFields: any = {};

  openChannelModal(channel?: any) {
    if (channel) {
      this.channelForm = { ...channel };
      try {
        this.channelFields = JSON.parse(channel.identifier || '{}');
      } catch {
        this.channelFields = {};
        // Legacy fallback: if it's a plain string, assign it to the first user field if it exists
        if (channel.channel_type) {
           const svc = this.channelServices.find(s => s.id === channel.channel_type);
           if (svc) {
              const ufs = svc.fields.filter((f: any) => !f.is_global);
              if (ufs.length > 0) {
                 this.channelFields[ufs[0].key] = channel.identifier;
              }
           }
        }
      }
    } else {
      this.channelForm = { name: '', channel_type: '', identifier: '', enabled: true };
      this.channelFields = {};
      if(this.channelServices.length > 0) {
          this.channelForm.channel_type = this.channelServices[0].id;
          this.onChannelTypeChange();
      }
    }
    this.showChannelModal = true;
  }

  onChannelTypeChange() {
    this.channelFields = {};
    if (this.channelForm.channel_type === 'ntfy') {
       // Generate a highly secure random string for the topic so users don't share a public channel
       this.channelFields['topic'] = 'mw_alerts_' + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    }
  }

  get selectedServiceFields() {
    if(!this.channelForm.channel_type) return [];
    const svc = this.channelServices.find(s => s.id === this.channelForm.channel_type);
    if(!svc) return [];
    return svc.fields.filter((f: any) => !f.is_global);
  }

  get isChannelFormValid() {
    if (!this.channelForm.name || this.channelServices.length === 0) return false;
    for (let f of this.selectedServiceFields) {
      if (f.required && !this.channelFields[f.key]) return false;
    }
    return true;
  }
  
  saveChannel() {
    this.channelForm.identifier = JSON.stringify(this.channelFields);
    this.data_provider.alert_channels_save(this.channelForm).then((res: any) => {
      if (res.result === 'ok') {
        this.show_toast("Success", "Channel saved.", "success");
        this.showChannelModal = false;
        this.loadData();
      } else {
        this.show_toast("Error", res.error || 'Failed to save channel', "danger");
      }
    });
  }
  
  deleteChannel(id: number) {
    if(confirm('Are you sure you want to delete this channel?')) {
      this.data_provider.alert_channels_delete(id).then(() => {
        this.show_toast("Success", "Channel deleted.", "success");
        this.loadData();
      });
    }
  }
  
  testChannel(id: number) {
    this.data_provider.alerts_test({channel_id: id}).then((res: any) => {
       if(res.result === 'ok') {
          this.show_toast("Test Successful", "Test notification sent and delivered.", "success");
       } else {
          this.show_toast("Test Failed", res.error || "Failed to send test notification.", "danger");
       }
    }).catch((err: any) => {
       this.show_toast("Test Error", "Server error while sending test notification.", "danger");
    });
  }

  getServiceName(type: string) {
    const svc = this.channelServices.find(s => s.id === type);
    return svc ? svc.name : type;
  }
}
