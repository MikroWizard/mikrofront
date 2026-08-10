import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { dataProvider } from '../../providers/mikrowizard/data';

@Component({
  selector: 'app-customer-firewall',
  templateUrl: './customer-firewall.component.html',
  styleUrls: ['./customer-firewall.component.scss']
})
export class CustomerFirewallComponent implements OnInit {
  deviceId: number = 0;
  
  // Presets
  presetStatus: Record<string, string> = {};
  loadingPresets: boolean = true;
  togglingPreset: string | null = null;
  presetsList = [
    { key: 'strict_dns_security', title: 'Malware Protection', desc: 'Forces all DNS queries to Cloudflare Malware blocking (1.1.1.2)', tooltip: 'Automatically blocks known malicious websites, phishing scams, and malware before they can even reach your devices.', icon: 'fa-solid fa-shield-virus' },
    { key: 'strict_dns_family', title: 'Family Protection DNS', desc: 'Forces DNS to Cloudflare Family (1.1.1.3) blocking adult content', tooltip: 'Ensures all devices on your network are protected from adult websites and malware using family-safe filters.', icon: 'fa-solid fa-children' },
    { key: 'gaming_console_block', title: 'Block Gaming Consoles', desc: 'Blocks common ports for Xbox, PlayStation, and PC gaming', tooltip: 'Stops devices from connecting to major gaming network services like Xbox Live and PlayStation Network.', icon: 'fa-solid fa-gamepad' },
    { key: 'gaming_block', title: 'Block Online Games', desc: 'Blocks Roblox, Minecraft, Epic Games, and Steam', tooltip: 'Prevents access to popular gaming websites and storefronts so games cannot be played or downloaded.', icon: 'fa-solid fa-ban' },
    { key: 'adult_content', title: 'Block Adult Content', desc: 'Strict DNS + Layer-7 filtering for adult material', tooltip: 'Uses aggressive scanning to block adult websites, explicit images, and inappropriate content across all devices.', icon: 'fa-solid fa-eye-slash' },
    { key: 'social_media_block', title: 'Block Social Media', desc: 'Blocks Facebook, Instagram, TikTok, Snapchat, Twitter', tooltip: 'Completely cuts off access to all major social media platforms and apps on the network.', icon: 'fa-solid fa-users-slash' },
    { key: 'block_tiktok_only', title: 'Block TikTok', desc: 'Surgically blocks TikTok domains', tooltip: 'Stops the TikTok app and website from loading on any device connected to your Wi-Fi.', icon: 'fa-brands fa-tiktok' },
    { key: 'block_youtube', title: 'Block YouTube', desc: 'Blocks YouTube domains', tooltip: 'Prevents video streaming and browsing on YouTube.', icon: 'fa-brands fa-youtube' },
    { key: 'block_netflix', title: 'Block Netflix', desc: 'Blocks Netflix domains', tooltip: 'Stops Netflix from streaming on smart TVs, phones, and computers.', icon: 'fa-solid fa-film' },
    { key: 'block_p2p', title: 'Block Torrents / P2P', desc: 'Layer-7 filtering for BitTorrent and P2P protocols', tooltip: 'Prevents users from illegally downloading movies or files using torrent software, saving your internet bandwidth.', icon: 'fa-solid fa-download' },
    { key: 'vpn_block', title: 'Block VPNs', desc: 'Blocks VPN protocols, ports, and commercial VPN domains', tooltip: 'Blocks standard VPN connections and provider websites. Note: Not a 100% solution. Stealth VPNs or apps that connect via cellular data before switching to Wi-Fi may bypass this block.', icon: 'fa-solid fa-lock' },
    { key: 'kids_mode', title: 'Kids Mode', desc: 'Family DNS + Blocks Social Media and Gaming', tooltip: 'The ultimate study mode: blocks adult content, all social media, and all online games with one click.', icon: 'fa-solid fa-child-reaching' },
    { key: 'night_mode', title: 'Night Mode', desc: 'Blocks ALL internet traffic (Management remains accessible)', tooltip: 'Instantly shuts off internet access for all devices in your home (perfect for bedtime).', icon: 'fa-solid fa-moon' }
  ];

  // Custom Rules
  customRules: any[] = [];
  loadingCustom: boolean = true;
  
  customForm: FormGroup;
  customModalVisible: boolean = false;
  addingCustom: boolean = false;
  customErrorMsg: string = '';

  // Address Lists
  alEntries: any[] = [];
  loadingAl: boolean = false;
  alForm: FormGroup;
  alModalVisible: boolean = false;
  addingAl: boolean = false;
  alErrorMsg: string = '';
  alSuccessMsg: string = '';

  constructor(
    private route: ActivatedRoute,
    private data_provider: dataProvider,
    private fb: FormBuilder
  ) {
    this.customForm = this.fb.group({
      type: ['ip', Validators.required],
      value: ['', Validators.required],
      label: ['', Validators.required]
    });
    this.alForm = this.fb.group({
      list: ['', Validators.required],
      address: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    const cached = localStorage.getItem('customer_selected_device_id');
    if (cached) {
      this.deviceId = parseInt(cached, 10);
      this.loadPresets();
      this.loadCustomRules();
      this.loadAddressLists();
    }
    
    window.addEventListener('storage', (event) => {
      if (event.key === 'customer_selected_device_id' && event.newValue) {
        this.deviceId = parseInt(event.newValue, 10);
        this.loadPresets();
        this.loadCustomRules();
        this.loadAddressLists();
      }
    });
  }

  loadPresets() {
    this.loadingPresets = true;
    this.data_provider.customerGetFirewallPresetStatus(this.deviceId).then((res: any) => {
      res = res.result || res;
      if (res.status === 'success' && res.presets) {
        this.presetStatus = res.presets;
      }
    }).finally(() => {
      this.loadingPresets = false;
    });
  }

  loadCustomRules() {
    this.loadingCustom = true;
    this.data_provider.customerGetFirewallRules(this.deviceId).then((res: any) => {
      res = res.result || res;
      if (res.status === 'success' && res.rules) {
        this.customRules = res.rules;
      }
    }).finally(() => {
      this.loadingCustom = false;
    });
  }

  togglePreset(key: string, event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.togglingPreset = key;
    
    const req = isChecked 
      ? this.data_provider.customerEnableFirewallPreset(this.deviceId, key)
      : this.data_provider.customerDisableFirewallPreset(this.deviceId, key);
      
    req.then((res: any) => {
      if (res.status === 'success') {
        this.presetStatus[key] = isChecked ? 'enabled' : 'disabled';
        setTimeout(() => { this.loadCustomRules(); }, 500); // Reload rules in case they interact
      } else {
        // Revert UI if failed
        (event.target as HTMLInputElement).checked = !isChecked;
        alert(res.err || "Failed to toggle preset");
      }
    }).finally(() => {
      this.togglingPreset = null;
      this.loadPresets(); // Refresh actual status
    });
  }

  openCustomModal() {
    this.customForm.reset({ type: 'ip' });
    this.customErrorMsg = '';
    this.customModalVisible = true;
  }
  
  closeCustomModal() {
    this.customModalVisible = false;
  }
  
  submitCustomForm() {
    if (this.customForm.invalid) return;
    this.addingCustom = true;
    this.customErrorMsg = '';
    
    this.data_provider.customerAddFirewallCustom(this.deviceId, this.customForm.value).then((res: any) => {
      if (res.status === 'success') {
        this.closeCustomModal();
        this.loadCustomRules();
      } else {
        this.customErrorMsg = res.err || "Failed to add block list entry";
      }
    }).finally(() => {
      this.addingCustom = false;
    });
  }

  // Address List logic
  loadAddressLists() {
    if (!this.deviceId) return;
    this.loadingAl = true;
    this.data_provider.customerGetAddressLists(this.deviceId).then((res: any) => {
      const data = res.result || res;
      if (Array.isArray(data)) {
        this.alEntries = data;
      }
    }).finally(() => {
      this.loadingAl = false;
    });
  }

  get availableAddressLists(): string[] {
    const lists = new Set<string>();
    for (const entry of this.alEntries) {
      if (entry.list && entry.list.startsWith('mw-sf:')) {
        lists.add(entry.list);
      }
    }
    return Array.from(lists);
  }

  isCustomerCreated(entry: any): boolean {
    return entry.comment.startsWith('mw-al:') || entry.comment === entry.list;
  }

  openAlModal() {
    this.alForm.reset();
    this.alErrorMsg = "";
    this.alSuccessMsg = "";
    this.alModalVisible = true;
  }

  closeAlModal() {
    this.alModalVisible = false;
  }

  submitAl() {
    if (this.alForm.invalid || !this.deviceId) return;
    this.addingAl = true;
    this.alErrorMsg = "";

    const payload = this.alForm.value;

    this.data_provider.customerAddAddressList(this.deviceId, payload).then((res: any) => {
      const data = res.result || res;
      if (data && data.status === 'success') {
        this.closeAlModal();
        this.loadAddressLists();
      } else {
        this.alErrorMsg = data.err || "Failed to add address list entry.";
      }
    }).catch(err => {
      this.alErrorMsg = "Connection error.";
    }).finally(() => {
      this.addingAl = false;
    });
  }

  toggleAl(entry: any) {
    if (!this.deviceId) return;
    const targetState = !entry.disabled;
    this.data_provider.customerToggleAddressList(this.deviceId, entry.id, targetState).then((res: any) => {
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
    if (!this.deviceId) return;
    if (!confirm(`Are you sure you want to remove "${entry.address}" from "${entry.list}"?`)) return;

    this.data_provider.customerDeleteAddressList(this.deviceId, entry.id).then((res: any) => {
      const data = res.result || res;
      if (data && data.status === 'success') {
        this.loadAddressLists();
      } else {
        alert(data.err || "Failed to delete entry.");
      }
    }).catch(err => {
      alert("Connection error.");
    });
  }

  toggleCustomRule(rule: any, event: Event) {
    const isChecked = !(event.target as HTMLInputElement).checked; // rule.disabled is inverse of checked
    this.data_provider.customerToggleFirewallCustom(this.deviceId, rule.id, isChecked).then((res: any) => {
      if (res.status === 'success') {
        rule.disabled = isChecked;
      } else {
        (event.target as HTMLInputElement).checked = !isChecked;
      }
    });
  }

  deleteCustomRule(ruleId: string) {
    if (confirm("Are you sure you want to remove this block rule?")) {
      this.data_provider.customerDeleteFirewallCustom(this.deviceId, ruleId).then((res: any) => {
        if (res.status === 'success') {
          this.loadCustomRules();
        }
      });
    }
  }

  moveRule(ruleId: string, direction: -1 | 1, index: number) {
    if (index + direction < 0 || index + direction >= this.customRules.length) return;
    
    const destRule = this.customRules[index + direction];
    const destinationId = destRule.id;
    
    // In routeros API move, to swap A and B, we move A to B's destination.
    // If moving down, we actually want to move A to after B, but RouterOS API "destination" places BEFORE destination.
    // So if direction is 1 (down), we move it before the item AFTER destRule, or just swap. 
    // Wait, let's just use the destination_id. Moving up (direction -1) places it before destRule.
    // Moving down (direction 1), we move destRule BEFORE ruleId.
    let targetRule = ruleId;
    let targetDest = destinationId;
    
    if (direction === 1) {
      targetRule = destinationId;
      targetDest = ruleId;
    }
    
    this.data_provider.customerMoveFirewallRule(this.deviceId, targetRule, targetDest).then((res: any) => {
      if (res.status === 'success') {
        // Swap locally for instant feedback
        const temp = this.customRules[index];
        this.customRules[index] = this.customRules[index + direction];
        this.customRules[index + direction] = temp;
      }
    });
  }

  getCustomLabel(comment: string): string {
    return comment.replace('mw-sf:custom:', '').replace(/_/g, ' ');
  }
}
