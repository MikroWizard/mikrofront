import { Component, OnInit, OnDestroy, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { loginChecker } from '../../providers/login_checker';
import { VpnService, VpnStatusResponse, VpnPeer, VpnServerConfig } from '../../providers/mikrowizard/vpn.service';
import { Subscription, delay, of, repeat, switchMap, timer, catchError } from 'rxjs';
import { Table } from 'primeng/table';
import { ToasterComponent, ToasterPlacement } from "@coreui/angular";
import { AppToastComponent } from "../toast-simple/toast.component";

@Component({
    templateUrl: 'vpn.component.html',
    styleUrls: ['vpn.component.scss']
})
export class VpnComponent implements OnInit, OnDestroy {
    @ViewChild("dt") table!: Table;
    @ViewChildren(ToasterComponent) viewChildren!: QueryList<ToasterComponent>;

    toasterForm = {
        autohide: true,
        delay: 3000,
        position: 'fixed' as ToasterPlacement,
        fade: true,
        closeButton: true,
    };

    public status: VpnStatusResponse | null = null;
    private pollingSubscription?: Subscription;
    private livePollingSubscription?: Subscription;

    // Aggregate stats
    public totalRx: number = 0;
    public totalTx: number = 0;
    public liveSpeedRx: number = 0;
    public liveSpeedTx: number = 0;
    public isCommunicationError: boolean = false;

    formatBytes(bytes: number, decimals: number = 2): string {
        if (!+bytes) return '0 B';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    public chartData: any = {
        labels: [],
        datasets: [
            {
                label: 'Rx Speed',
                backgroundColor: 'rgba(46, 184, 92, 0.1)',
                borderColor: '#2eb85c',
                pointBackgroundColor: '#2eb85c',
                pointHoverBackgroundColor: '#fff',
                borderWidth: 2,
                fill: true,
                data: []
            },
            {
                label: 'Tx Speed',
                backgroundColor: 'rgba(51, 153, 255, 0.1)',
                borderColor: '#3399ff',
                pointBackgroundColor: '#3399ff',
                pointHoverBackgroundColor: '#fff',
                borderWidth: 2,
                fill: true,
                data: []
            }
        ]
    };

    public chartOptions: any = {
        maintainAspectRatio: false,
        plugins: {
            legend: { display: true },
            tooltip: {
                callbacks: {
                    label: (context: any) => {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += this.formatBytes(context.parsed.y) + '/s';
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            x: { display: true },
            y: {
                display: true,
                beginAtZero: true,
                ticks: {
                    callback: (value: any) => {
                        return this.formatBytes(value) + '/s';
                    }
                }
            }
        },
        elements: {
            line: { tension: 0.4 },
            point: { radius: 0, hitRadius: 10, hoverRadius: 4 }
        }
    };

    // Grid configs
    public source: Array<VpnPeer> = [];
    public loading: boolean = true;

    // Modals state
    public addPeerModalVisible = false;
    public addPeerStep = 1;
    public peerForm: any = {
        pubkey: '',
        custom_ip: '',
        name: '',
        description: '',
        nat_mode: 'full',
        split_targets: [''], // Array of strings
        link_device: false,
        persistent_keepalive: 25,
        custom_interface: '',
        mt_user: '',
        mt_pass: '',
        mt_port: 8728
    };
    public editingPeer = false;

    public configResult: { script?: string, qrBlobUrl?: SafeUrl } = {};
    public activePeerConfig: VpnPeer | null = null;

    public serverConfigModalVisible = false;
    public serverConfig: Partial<VpnServerConfig> = {};

    public deleteModalVisible = false;
    public peerToDelete: VpnPeer | null = null;

    public toggleModalVisible = false;
    public peerToToggle: VpnPeer | null = null;

    public resetPeerModalVisible = false;
    public peerToReset: VpnPeer | null = null;

    public resetServerModalVisible = false;

    applyFilterGlobal($event: any, stringVal: string) {
        this.table.filterGlobal(($event.target as HTMLInputElement).value, stringVal);
    }

    constructor(
        private login_checker: loginChecker,
        private router: Router,
        private vpnService: VpnService,
        private sanitizer: DomSanitizer
    ) {
        if (!this.login_checker.isLoggedIn()) {
            setTimeout(() => this.router.navigate(["login"]), 100);
        }
    }

    ngOnInit(): void {
        this.startPolling();
    }

    ngOnDestroy(): void {
        if (this.pollingSubscription) {
            this.pollingSubscription.unsubscribe();
        }
        if (this.livePollingSubscription) {
            this.livePollingSubscription.unsubscribe();
        }
    }

    startPolling() {
        // Slow poll for heavy metadata (10s)
        this.pollingSubscription = timer(0, 10000).pipe(
            switchMap(() => this.vpnService.getStatus().pipe(
                catchError(err => {
                    console.error("VPN Polling Error:", err);
                    return of(null);
                })
            ))
        ).subscribe({
            next: (res) => {
                if (res) {
                    this.status = res;
                    this.isCommunicationError = res.status === 'failed' && (res.error?.includes('Connection refused') || false);
                    
                    if (!this.isCommunicationError) {
                        this.source = (res.peers || []).map(p => ({
                            ...p,
                            _search_index: `${p.name || ''} ${p.assigned_ip || ''} ${p.public_key || ''} ${p.description || ''}`
                        }));
                        this.computeTotals();
                        this.loading = false;
                    } else {
                        this.loading = false;
                        this.source = [];
                    }
                } else {
                    if (!this.status) {
                        this.loading = true; // Show loading if we never got a successful status
                    }
                }
            }
        });

        // Fast poll for live bandwidth (2s)
        this.livePollingSubscription = timer(2000, 2000).pipe(
            switchMap(() => this.vpnService.getLiveStatus().pipe(
                catchError(err => of(null))
            ))
        ).subscribe({
            next: (liveData) => {
                if (liveData) {
                    // Update server top card speeds
                    this.liveSpeedRx = liveData.server.rx_speed || 0;
                    this.liveSpeedTx = liveData.server.tx_speed || 0;
                    this.totalRx = liveData.server.rx_bytes;
                    this.totalTx = liveData.server.tx_bytes;

                    // Surgically update existing peers without re-creating array
                    if (this.source && this.source.length > 0 && Array.isArray(liveData.peers)) {
                        for (let i = 0; i < this.source.length; i++) {
                            const peer = this.source[i];
                            const pubkey = peer.public_key;

                            const livePeer = liveData.peers.find(p => p.public_key === pubkey);

                            if (livePeer && livePeer.stats && peer.stats) {
                                // Instead of making a new object (which triggers grid redraw), mutate the stats deeply
                                peer.stats.rx_bytes = livePeer.stats.rx_bytes;
                                peer.stats.tx_bytes = livePeer.stats.tx_bytes;
                                peer.stats.rx_speed = livePeer.stats.rx_speed;
                                peer.stats.tx_speed = livePeer.stats.tx_speed;
                            }
                        }
                    }
                }
            }
        });
    }

    refreshData() {
        this.vpnService.getStatus().subscribe({
            next: (res) => {
                if (res) {
                    this.status = res;
                    this.isCommunicationError = res.status === 'failed' && (res.error?.includes('Connection refused') || false);

                    if (!this.isCommunicationError) {
                        this.source = (res.peers || []).map(p => ({
                            ...p,
                            _search_index: `${p.name || ''} ${p.assigned_ip || ''} ${p.public_key || ''} ${p.description || ''}`
                        }));
                        this.computeTotals();
                    } else {
                        this.source = [];
                    }
                }
            },
            error: (err) => console.error("Error refreshing data:", err)
        });
    }

    computeTotals() {
        this.totalRx = 0;
        this.totalTx = 0;
        for (const p of this.source) {
            if (p.stats) {
                this.totalRx += p.stats.rx_bytes / 1048576; // To MB
                this.totalTx += p.stats.tx_bytes / 1048576; // To MB
            }
        }

        const now = new Date();
        const timeLabel = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0') + ':' + now.getSeconds().toString().padStart(2, '0');

        this.chartData.labels.push(timeLabel);
        this.chartData.datasets[0].data.push(this.liveSpeedRx);
        this.chartData.datasets[1].data.push(this.liveSpeedTx);

        // Keep last 30 intervals (2.5 minutes of history)
        if (this.chartData.labels.length > 30) {
            this.chartData.labels.shift();
            this.chartData.datasets[0].data.shift();
            this.chartData.datasets[1].data.shift();
        }

        // Trigger change detection for chart
        this.chartData = { ...this.chartData };
    }

    show_toast(title: string, body: string, color: string) {
        const props = { ...this.toasterForm, color, title, body };
        if (this.viewChildren && this.viewChildren.first) {
            const componentRef = this.viewChildren.first.addToast(
                AppToastComponent,
                props,
                {}
            );
            if (componentRef) {
                componentRef.instance["closeButton"] = props.closeButton;
            }
        }
    }

    // --- Modals & Actions ---

    openAddPeerModal() {
        this.addPeerModalVisible = true;
        this.addPeerStep = 1;
        this.editingPeer = false;
        this.peerForm = {
            pubkey: '', custom_ip: '', name: '', description: '', nat_mode: 'full', split_targets: [''], link_device: false, persistent_keepalive: 25, custom_interface: '',
            mt_user: '', mt_pass: '', mt_port: 8728
        };
    }

    addSplitTarget() {
        this.peerForm.split_targets.push('');
    }

    removeSplitTarget(index: number) {
        this.peerForm.split_targets.splice(index, 1);
    }

    trackByIndex(index: number, obj: any): any {
        return index;
    }

    submitPeer() {
        // Filter empty splits
        const payload = { ...this.peerForm };
        payload.split_targets = payload.split_targets.filter((s: string) => s.trim() !== '');

        // Scrub credentials if the user unchecked "Link & Manage as MikroTik Device"
        if (!payload.link_device) {
            payload.mt_user = null;
            payload.mt_pass = null;
            payload.mt_port = null;
        }

        const isLinkDevice = payload.link_device;

        // Remove the deprecated 'link_device' flag from the API payload entirely
        delete payload.link_device;

        if (this.editingPeer) {
            this.vpnService.editPeer(payload).subscribe({
                next: (res) => {
                    this.show_toast("Success", "Peer updated successfully", "success");
                    this.addPeerModalVisible = false;
                    this.refreshData();
                },
                error: (err) => this.show_toast("Error", err.error?.message || "Failed to update peer", "danger")
            });
        } else {
            this.vpnService.addPeer(payload).subscribe({
                next: (res) => {
                    this.show_toast("Success", "Peer created successfully", "success");
                    this.addPeerModalVisible = false;
                    this.refreshData();
                    // Auto-open appropriate config wizard
                    if (isLinkDevice) {
                        this.openScriptModal(res.peer);
                    } else {
                        this.openQrModal(res.peer);
                    }
                },
                error: (err) => this.show_toast("Error", err.error?.message || "Failed to add peer", "danger")
            });
        }
    }

    promptToggleEnabled(item: VpnPeer) {
        this.peerToToggle = item;
        this.toggleModalVisible = true;
    }

    confirmToggle() {
        if (!this.peerToToggle) return;
        const item = this.peerToToggle;
        const newState = !item.is_enabled;

        this.vpnService.togglePeer(item.public_key, newState).subscribe({
            next: () => {
                this.show_toast("Success", `Peer ${newState ? 'enabled' : 'disabled'}`, "success");
                item.is_enabled = newState;
                this.source = [...this.source]; // Force grid update
                this.refreshData();
                this.toggleModalVisible = false;
                this.peerToToggle = null;
            },
            error: (err) => {
                this.show_toast("Error", err.error?.message || "Failed to toggle peer", "danger");
                this.toggleModalVisible = false;
                this.peerToToggle = null;
            }
        });
    }

    openEditModal(item: VpnPeer) {
        this.editingPeer = true;
        this.addPeerModalVisible = true;
        this.addPeerStep = 1;
        this.peerForm = {
            pubkey: item.public_key,
            custom_ip: item.assigned_ip,
            name: item.name || '',
            description: item.description || '',
            nat_mode: item.nat_mode,
            split_targets: [...item.split_targets],
            link_device: !!item.linked_device_id || !!item.mt_user,
            persistent_keepalive: item.persistent_keepalive,
            custom_interface: item.custom_interface || '',
            mt_user: item.mt_user || '',
            mt_pass: item.mt_pass || '',
            mt_port: item.mt_port || 8728
        };
        if (this.peerForm.split_targets.length === 0) this.peerForm.split_targets.push('');
    }

    scanDevice(item: VpnPeer) {
        this.vpnService.scanLinkedDevice(item.public_key).subscribe({
            next: (res) => this.show_toast("Success", res.message || "Manual scan initiated asynchronously", "success"),
            error: (err) => this.show_toast("Error", err.error?.message || "Scan failed", "danger")
        });
    }

    public scriptModalVisible = false;
    public qrModalVisible = false;

    // Fetch and show script
    openScriptModal(item: VpnPeer) {
        this.activePeerConfig = item;
        this.configResult = {};
        this.scriptModalVisible = true;
        this.qrModalVisible = false; // Auto-close QR if open
        this.vpnService.getPeerMikrotikScript(item.public_key).subscribe({
            next: (res) => {
                const rawScript = res.script || '';
                // Ensure double-escaped newlines and carriage returns are aggressively parsed to real newlines
                this.configResult.script = rawScript.split('\\n').join('\n').replace(/\r\n/g, '\n');
                this.scriptModalVisible = true;
            },
            error: (err) => this.show_toast("Error", "Failed to fetch Mikrotik script", "danger")
        });
    }

    // Fetch and show QR
    openQrModal(item: VpnPeer) {
        this.activePeerConfig = item;
        this.configResult = {};
        this.scriptModalVisible = false; // Auto-close Script if open
        this.vpnService.getPeerQrCode(item.public_key).subscribe({
            next: (blob) => {
                const url = URL.createObjectURL(blob);
                this.configResult.qrBlobUrl = this.sanitizer.bypassSecurityTrustUrl(url);
                this.qrModalVisible = true;
            },
            error: (err) => this.show_toast("Error", "Failed to fetch QR code", "danger")
        });
    }

    // Download config directly
    downloadPeerConfigDirect(item: VpnPeer) {
        this.vpnService.getPeerConfig(item.public_key).subscribe({
            next: (res) => {
                const blob = new Blob([res.config], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${item.assigned_ip || 'peer'}.conf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            },
            error: (err) => this.show_toast("Error", "Failed to fetch config", "danger")
        });
    }

    copyScript() {
        if (this.configResult.script) {
            navigator.clipboard.writeText(this.configResult.script).then(() => {
                this.show_toast("Success", "Copied to clipboard", "success");
            });
        }
    }

    confirmDelete(item: VpnPeer) {
        this.peerToDelete = item;
        this.deleteModalVisible = true;
    }

    executeDelete() {
        if (this.peerToDelete) {
            this.vpnService.deletePeer(this.peerToDelete.public_key).subscribe({
                next: () => {
                    this.show_toast("Success", "Peer deleted permanently", "success");
                    this.deleteModalVisible = false;
                    this.refreshData();
                },
                error: (err) => this.show_toast("Error", err.error?.message || "Delete failed", "danger")
            });
        }
    }

    openServerConfigModal() {
        this.serverConfigModalVisible = true;
        this.vpnService.getSystemConfig().subscribe({
            next: (res) => this.serverConfig = res.config || {},
            error: (err) => this.show_toast("Error", "Failed to fetch config", "danger")
        });
    }

    saveServerConfig() {
        this.vpnService.updateSystemConfig(this.serverConfig).subscribe({
            next: () => {
                this.show_toast("Success", "Server config updated", "success");
                this.serverConfigModalVisible = false;
                this.refreshData();
            },
            error: (err) => this.show_toast("Error", err.error?.message || "Update failed", "danger")
        });
    }

    // === COUNTER RESETS ===
    promptResetServer() {
        this.resetServerModalVisible = true;
    }

    confirmResetServer() {
        this.vpnService.resetServerCounters().subscribe({
            next: () => {
                this.resetServerModalVisible = false;
                this.show_toast('Success', 'Global server traffic counters have been reset.', 'success');
                this.totalRx = 0;
                this.totalTx = 0;
                // Force chart data flush
                this.chartData = {
                    ...this.chartData,
                    labels: [],
                    datasets: [
                        { ...this.chartData.datasets[0], data: [] },
                        { ...this.chartData.datasets[1], data: [] }
                    ]
                };
            },
            error: (err) => {
                console.error(err);
                this.resetServerModalVisible = false;
                this.show_toast('Error', 'Failed to reset server counters.', 'danger');
            }
        });
    }

    promptResetPeer(peer: VpnPeer) {
        this.peerToReset = peer;
        this.resetPeerModalVisible = true;
    }

    confirmResetPeer() {
        if (!this.peerToReset || !this.peerToReset.public_key) return;
        this.vpnService.resetPeerCounters(this.peerToReset.public_key).subscribe({
            next: () => {
                this.show_toast('Success', `Counters reset for ${this.peerToReset?.name || this.peerToReset?.assigned_ip}`, 'success');
                if (this.peerToReset && this.peerToReset.stats) {
                    this.peerToReset.stats.rx_bytes = 0;
                    this.peerToReset.stats.tx_bytes = 0;
                    this.peerToReset.stats.rx_speed = 0;
                    this.peerToReset.stats.tx_speed = 0;
                }
                this.resetPeerModalVisible = false;
                this.peerToReset = null;
            },
            error: (err) => {
                console.error(err);
                this.resetPeerModalVisible = false;
                this.show_toast('Error', `Failed to reset counters for peer.`, 'danger');
                this.peerToReset = null;
            }
        });
    }
}
