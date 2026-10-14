import { Component, OnInit, OnDestroy, ViewChild, ElementRef, NgZone, HostListener, ChangeDetectorRef } from "@angular/core";
import { dataProvider } from "../../providers/mikrowizard/data";
import { loginChecker } from "../../providers/login_checker";
import { Router } from "@angular/router";
import { Network } from 'vis-network/peer';
import { DataSet } from 'vis-data';
import {
  NetMap, GraphNode, GraphLink, GraphPayload, DevStatus, DisplayNode, DisplayEdge, Filters, GroupMode, FilterMode,
  emptyFilters, STATE_LABEL, STATE_ORDER, TYPE_LABEL, fmtBps, fmtDuration, fmtAgo,
  problemSections, ProblemSection, ProblemRow, ProblemQuery,
} from './netmap.model';
import { nodeIcon, STATE_COLOR } from './netmap.icons';

type LayoutMode = 'radial' | 'tree';

interface PathHop { node: GraphNode; state: string | null; ports: string; rate: string; }

const PREFS_KEY = 'mw-netmap-prefs';
const STATUS_EVERY_MS = 20000;
const LINKS_EVERY_MS = 30000;

@Component({
  templateUrl: "maps.component.html",
  styleUrls: ["maps.component.scss"],
})
export class MapsComponent implements OnInit, OnDestroy {
  @ViewChild('network', { static: true }) networkContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('tooltip', { static: true }) tooltipEl!: ElementRef<HTMLDivElement>;
  @ViewChild('shell', { static: true }) shellEl!: ElementRef<HTMLDivElement>;
  @ViewChild('searchBox') searchBox?: ElementRef<HTMLInputElement>;

  // session
  public uid = 0;
  public uname = '';
  public ispro = false;
  public isAdmin = false;
  public tz = '';

  // data
  map = new NetMap();
  private network: Network | null = null;
  private nodesDs = new DataSet<any>([]);
  private edgesDs = new DataSet<any>([]);
  private nodeSig = new Map<string, string>();
  private edgeSig = new Map<string, string>();
  private disp = new Map<string, DisplayNode>();
  private dispEdges = new Map<string, DisplayEdge>();
  private ownerOfKey = new Map<string, string>();
  private linkRates = new Map<string, number[]>();

  // UI state
  loading = true;
  empty = false;
  errorMsg = '';
  layoutMode: LayoutMode = 'radial';
  groupMode: GroupMode = 'area';
  filterMode: FilterMode = 'dim';
  filters: Filters = emptyFilters();
  expanded = new Set<string>();
  leftOpen = true;
  leftTab: 'problems' | 'filters' = 'problems';
  noc = false;
  dark = false;
  showLegend = false;

  searchText = '';
  searchResults: GraphNode[] = [];
  searchOpen = false;
  searchIdx = 0;

  panelKind: 'device' | 'discovered' | 'locked' | 'cluster' | 'link' | 'path' | null = null;
  panelNode: GraphNode | null = null;
  panelDisp: DisplayNode | null = null;
  panelEdge: DisplayEdge | null = null;
  panelData: any = null;
  panelLoading = false;
  sparks: { [k: string]: string } = {};
  pingResult: any = null;
  pinging = false;

  pathFrom: GraphNode | null = null;
  pathPicking = false;
  pathHops: PathHop[] = [];
  private focusNodes: Set<string> | null = null;
  private focusEdges: Set<string> | null = null;
  private focusKey: string | null = null;      // "neighbours of" highlight
  private pathKeys: string[] = [];             // path highlight (node keys)

  counts: { [k: string]: number } = {};
  problems: { node: GraphNode; s: DevStatus }[] = [];
  // problems panel, built for hundreds of alerts: root-cause folding, areas, paging
  pv: ProblemQuery = { groupBy: 'cause', sort: 'severity', states: {}, text: '' };
  pvSections: ProblemSection[] = [];
  pvRows = 0;
  private pvLimit = new Map<string, number>();
  private pvSecOpen = new Map<string, boolean>();
  private pvBehindOpen = new Set<string>();
  readonly problemStates = ['down', 'degraded', 'warn', 'maint'];
  showHelp = false;
  // "this neighbour is managed device X" (admins)
  managedList: { id: number; label: string }[] = [];
  aliasPick = '';
  aliasBusy = false;
  shown = 0;
  lastStatusAt = 0;
  now = Date.now() / 1000;
  filterCount = 0;

  // modals kept from the previous map
  showWebAccessModal = false;
  showGatewayNoticeModal = false;
  gatewayNoticeType: 'not_installed' | 'update_required' = 'not_installed';
  gatewayNoticeTitle = '';
  gatewayNoticeMessage = '';
  gatewayNoticeDocUrl = '';
  showResetModal = false;
  accessTarget: { id: number | null; ip: string; mikrotik: boolean } | null = null;

  readonly stateOrder = STATE_ORDER;
  readonly stateLabel = STATE_LABEL;
  readonly typeLabel = TYPE_LABEL;
  readonly stateColor = STATE_COLOR;
  readonly typeKeys = Object.keys(TYPE_LABEL);
  readonly fmtBps = fmtBps;
  readonly fmtDuration = fmtDuration;

  private statusTimer: any = null;
  private linksTimer: any = null;
  private clockTimer: any = null;
  private layoutSaveTimer: any = null;
  private pendingLayout: { [k: string]: number[] } = {};
  private destroyed = false;
  private firstLoad = true;
  private viewTimer: any = null;

  constructor(
    private data_provider: dataProvider,
    private router: Router,
    private login_checker: loginChecker,
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
  ) {
    if (!this.login_checker.isLoggedIn()) {
      setTimeout(() => this.router.navigate(["login"]), 100);
    }
    this.data_provider.getSessionInfo().then((res: any) => {
      this.uid = res.uid;
      this.uname = res.name;
      this.ispro = res.ISPRO;
      this.isAdmin = ['admin', 'superuser'].indexOf(res.role) >= 0 || !res.role;
      if (!this.ispro) {
        setTimeout(() => this.router.navigate(["dashboard"]), 100);
      }
      this.tz = res.tz;
    });
  }

  // ------------------------------------------------------------------ lifecycle

  ngOnInit(): void {
    this.loadFontAwesome();
    this.restorePrefs();
    this.dark = this.isDark();
    this.loadGraph(true);
    this.clockTimer = setInterval(() => { this.now = Date.now() / 1000; }, 5000);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    clearTimeout(this.statusTimer);
    clearTimeout(this.linksTimer);
    clearInterval(this.clockTimer);
    clearTimeout(this.layoutSaveTimer);
    clearTimeout(this.viewTimer);
    this.flushLayout();
    if (this.network) {
      this.network.destroy();
      this.network = null;
    }
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    }
  }

  private loadFontAwesome(): void {
    if (!document.querySelector('link[href*="font-awesome"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
      document.head.appendChild(link);
    }
  }

  private isDark(): boolean {
    const t = document.documentElement.getAttribute('data-coreui-theme') || document.body.getAttribute('data-coreui-theme');
    return t === 'dark' || document.body.classList.contains('dark-theme');
  }

  private restorePrefs(): void {
    try {
      const p = JSON.parse(localStorage.getItem(PREFS_KEY) || 'null');
      if (p) {
        this.layoutMode = p.layoutMode === 'tree' ? 'tree' : 'radial';
        if (['none', 'area', 'router', 'subnet'].indexOf(p.groupMode) >= 0) { this.groupMode = p.groupMode; this.firstLoad = false; }
        this.filterMode = p.filterMode === 'hide' ? 'hide' : 'dim';
        this.leftOpen = p.leftOpen !== false;
        this.leftTab = p.leftTab === 'filters' ? 'filters' : 'problems';
        if (p.filters) { this.filters = Object.assign(emptyFilters(), p.filters); }
        if (p.pv) {
          if (['cause', 'area', 'none'].indexOf(p.pv.groupBy) >= 0) { this.pv.groupBy = p.pv.groupBy; }
          if (['severity', 'longest', 'newest', 'name'].indexOf(p.pv.sort) >= 0) { this.pv.sort = p.pv.sort; }
        }
      }
    } catch (e) { /* storage unavailable */ }
    this.updateFilterCount();
  }

  savePrefs(): void {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({
        layoutMode: this.layoutMode, groupMode: this.groupMode, filterMode: this.filterMode,
        leftOpen: this.leftOpen, leftTab: this.leftTab, filters: this.filters,
        pv: { groupBy: this.pv.groupBy, sort: this.pv.sort },
      }));
    } catch (e) { /* storage unavailable */ }
  }

  // ------------------------------------------------------------------ data

  loadGraph(withStatus = false, force = false): void {
    if (this.destroyed) { return; }
    this.loading = !this.map.nodes.size;
    const params: any = { mode: this.layoutMode };
    if (this.map.version && !force) { params.v = this.map.version; }
    if (force) { params.force = true; }
    this.data_provider.getNetworkGraph(params).then((res: any) => {
      if (this.destroyed) { return; }
      if (!res || res.status === 'failed') {
        this.loading = false;
        this.errorMsg = (res && (res.err || res.error)) || 'Could not load the network map.';
        return;
      }
      this.errorMsg = '';
      if (!res.unchanged) {
        this.map.load(res as GraphPayload);
        this.dropUnknownGroups();
        this.buildManagedList();
        if (this.firstLoad) {
          const n = this.map.nodes.size;
          this.groupMode = n > 800 ? 'area' : (n > 300 ? 'router' : 'none');
          this.firstLoad = false;
        }
      }
      this.empty = this.map.links.length === 0;
      this.loading = false;
      if (withStatus) {
        this.loadStatus(true);
      } else {
        this.render(!res.unchanged && !this.network);
      }
    }).catch((err: any) => {
      this.loading = false;
      this.errorMsg = 'Could not load the network map.';
      console.error('networkmap graph', err);
    });
  }

  loadStatus(first = false): void {
    clearTimeout(this.statusTimer);
    if (this.destroyed) { return; }
    if (document.hidden && !first) {
      this.statusTimer = setTimeout(() => this.loadStatus(), STATUS_EVERY_MS);
      return;
    }
    this.data_provider.getNetworkStatus().then((res: any) => {
      if (this.destroyed) { return; }
      if (res && res.d) {
        this.map.setStatus(res.cols, res.d);
        this.lastStatusAt = Date.now() / 1000;
        this.counts = this.map.counts();
        this.problems = this.map.problems();
        this.rebuildProblems();
        const gv = res.gv;
        // gv = "<graph>:<permissions>", version = "<graph>:<mode>:<permissions>"
        const vp = this.map.version.split(':');
        if (gv && this.map.version && vp[0] + ':' + (vp[2] || '') !== gv) {
          this.loadGraph(false);
        }
      }
      this.render(first);
      if (this.empty) {
        // topology not discovered yet: look again soon
        this.statusTimer = setTimeout(() => this.loadGraph(true), 30000);
        return;
      }
      this.statusTimer = setTimeout(() => this.loadStatus(), STATUS_EVERY_MS);
    }).catch(() => {
      this.render(first);
      this.statusTimer = setTimeout(() => this.loadStatus(), STATUS_EVERY_MS);
    });
  }

  refresh(): void {
    this.loadGraph(true, true);
  }

  // ------------------------------------------------------------------ rendering

  private nodeKind(n: GraphNode | undefined): string {
    if (!n) { return 'cluster'; }
    if (n.lk) { return 'locked'; }
    return n.m ? 'managed' : 'discovered';
  }

  private visNode(d: DisplayNode): any {
    const n = d.node;
    const kind = d.cluster ? 'cluster' : this.nodeKind(n);
    const state = d.cluster ? (d.state || 'unknown') : d.state;
    const focusDim = this.focusNodes ? !this.focusNodes.has(d.id) : false;
    const ink = this.dark ? '#e5e7eb' : '#1f2937';
    let label = d.label;
    if (d.cluster) {
      label = d.label + '\n' + d.total + ' device' + (d.total === 1 ? '' : 's') +
        (d.down ? '  ● ' + d.down + ' down' : '') + (d.warn ? '  ▲ ' + d.warn : '');
    } else if (n) {
      if (n.m && n.ip) { label += '\n' + n.ip; }
      if (state === 'down' && n.id !== undefined) {
        const s = this.map.status.get(n.id);
        label += '\nDOWN' + (s && s.since ? ' ' + fmtDuration(this.now - s.since) : '');
      }
      if (d.folded) { label += '\n+' + d.folded + ' CPE'; }
    }
    const isCore = !!n && n.dp === 0 && this.map.cores.indexOf(n.k) >= 0;
    const size = d.cluster ? Math.min(34, 20 + Math.log2(d.total + 1) * 2) : (isCore ? 24 : (n && n.m ? 17 : 12));
    return {
      id: d.id,
      x: d.x, y: d.y,
      label,
      shape: 'image',
      image: nodeIcon(n?.t || 'unknown', kind, state, this.dark),
      size,
      opacity: d.dim || focusDim ? 0.16 : 1,
      font: {
        color: state === 'down' ? (this.dark ? '#f87171' : '#dc2626') : ink,
        size: d.cluster ? 14 : (n && n.m ? 12 : 10),
        face: 'Inter, Arial, sans-serif',
        strokeWidth: 3,
        strokeColor: this.dark ? '#111827' : '#ffffff',
        bold: { color: ink },
      },
    };
  }

  private visEdge(e: DisplayEdge): any {
    const a = this.disp.get(e.from), b = this.disp.get(e.to);
    // a link is drawn as broken only when a device at its end is down (not a whole group)
    const down = (!!a && !a.cluster && a.state === 'down') || (!!b && !b.cluster && b.state === 'down');
    const focusDim = this.focusEdges ? !this.focusEdges.has(e.id) : false;
    const onPath = this.focusEdges ? this.focusEdges.has(e.id) && this.pathHops.length > 0 : false;
    const rate = this.edgeRate(e);
    let width = e.count > 1 ? 2.2 : 1.4;
    let color = this.dark ? '#64748b' : '#94a3b8';
    if (rate !== null) {
      width = Math.max(1.4, Math.min(8, 1 + Math.log10(Math.max(1, rate / 1e5)) * 1.6));
      color = rate > 5e8 ? '#7c3aed' : (rate > 1e8 ? '#2563eb' : (rate > 1e7 ? '#0ea5e9' : color));
    }
    if (down) { color = '#dc2626'; }
    if (onPath) { color = '#2563eb'; width = Math.max(width, 4); }
    let label: string | undefined;
    if (e.count > 1) { label = '×' + e.count; }
    return {
      id: e.id, from: e.from, to: e.to,
      width,
      color: { color, highlight: '#2563eb', hover: '#2563eb', opacity: (e.dim || focusDim) ? 0.12 : 0.9 },
      dashes: down ? [6, 5] : false,
      label,
      font: { size: 10, color: this.dark ? '#cbd5e1' : '#334155', strokeWidth: 3, strokeColor: this.dark ? '#111827' : '#ffffff', align: 'middle' },
      smooth: false,
    };
  }

  /** Throughput of a drawn edge from the stored rates of its managed end(s). */
  private edgeRate(e: DisplayEdge): number | null {
    let best: number | null = null;
    for (const l of e.links) {
      for (const [end, portIdx] of [[l.a, 0], [l.b, 1]] as [string, number][]) {
        const n = this.map.nodes.get(end);
        if (!n || !n.m || n.id === undefined) { continue; }
        for (const p of l.ps) {
          const r = this.linkRates.get(n.id + '|' + p[portIdx]);
          if (r) {
            const v = Math.max(r[0] || 0, r[1] || 0);
            best = best === null ? v : Math.max(best, v);
          }
        }
      }
    }
    return best;
  }

  render(fit = false): void {
    const t0 = performance.now();
    // NOC view is always drawn on a dark canvas
    this.dark = this.isDark() || this.noc;
    const view = this.map.display(this.groupMode, this.expanded, this.filters, this.filterMode);
    this.shown = view.shown;
    this.disp = new Map(view.nodes.map(d => [d.id, d]));
    this.dispEdges = new Map(view.edges.map(e => [e.id, e]));
    this.ownerOfKey.clear();
    for (const d of view.nodes) {
      if (!d.cluster) { this.ownerOfKey.set(d.id, d.id); }
      for (const m of d.members || []) { this.ownerOfKey.set(m, d.id); }
    }
    this.recomputeFocus();
    // diff against what is drawn
    const nodeAdd: any[] = [], nodeUpd: any[] = [];
    const seen = new Set<string>();
    for (const d of view.nodes) {
      const v = this.visNode(d);
      const sig = JSON.stringify(v);
      seen.add(d.id);
      const old = this.nodeSig.get(d.id);
      if (old === undefined) { nodeAdd.push(v); } else if (old !== sig) { nodeUpd.push(v); }
      this.nodeSig.set(d.id, sig);
    }
    const nodeDel = [...this.nodeSig.keys()].filter(k => !seen.has(k));
    nodeDel.forEach(k => this.nodeSig.delete(k));
    const edgeAdd: any[] = [], edgeUpd: any[] = [];
    const seenE = new Set<string>();
    for (const e of view.edges) {
      const v = this.visEdge(e);
      const sig = JSON.stringify(v);
      seenE.add(e.id);
      const old = this.edgeSig.get(e.id);
      if (old === undefined) { edgeAdd.push(v); } else if (old !== sig) { edgeUpd.push(v); }
      this.edgeSig.set(e.id, sig);
    }
    const edgeDel = [...this.edgeSig.keys()].filter(k => !seenE.has(k));
    edgeDel.forEach(k => this.edgeSig.delete(k));

    this.zone.runOutsideAngular(() => {
      if (edgeDel.length) { this.edgesDs.remove(edgeDel); }
      if (nodeDel.length) { this.nodesDs.remove(nodeDel); }
      if (nodeAdd.length) { this.nodesDs.add(nodeAdd); }
      if (nodeUpd.length) { this.nodesDs.update(nodeUpd); }
      if (edgeAdd.length) { this.edgesDs.add(edgeAdd); }
      if (edgeUpd.length) { this.edgesDs.update(edgeUpd); }
      if (!this.network) {
        this.createNetwork();
        fit = true;
      }
      if (fit && this.network) { this.network.fit({ animation: false }); }
    });
    if ((window as any).MW_NETMAP_DEBUG) {
      console.log('netmap render', view.nodes.length, 'nodes', view.edges.length, 'edges', Math.round(performance.now() - t0), 'ms');
    }
  }

  private createNetwork(): void {
    const container = this.networkContainer.nativeElement;
    const options: any = {
      autoResize: true,
      layout: { improvedLayout: false, randomSeed: 1 },
      physics: { enabled: false },
      interaction: {
        hover: true, hoverConnectedEdges: false, selectConnectedEdges: false, tooltipDelay: 3600000,
        hideEdgesOnDrag: true, hideEdgesOnZoom: true, multiselect: false, navigationButtons: false, keyboard: false,
        zoomSpeed: 0.8,
      },
      nodes: { shadow: false, borderWidth: 0, scaling: { label: { enabled: false, drawThreshold: 7 } }, chosen: true },
      edges: { shadow: false, smooth: false, selectionWidth: 2, hoverWidth: 0.5 },
    };
    const net = new Network(container, { nodes: this.nodesDs, edges: this.edgesDs } as any, options);
    this.network = net;
    if ((window as any).MW_NETMAP_DEBUG) { (window as any).__netmap = net; }
    net.on('click', (p: any) => this.zone.run(() => this.onClick(p)));
    net.on('doubleClick', (p: any) => this.zone.run(() => this.onDoubleClick(p)));
    net.on('dragEnd', (p: any) => this.onDragEnd(p));
    net.on('hoverNode', (p: any) => this.showTooltip(p.node, p.event));
    net.on('blurNode', () => this.hideTooltip());
    net.on('dragStart', () => this.hideTooltip());
    net.on('zoom', () => { this.hideTooltip(); this.scheduleViewWork(); });
    net.on('dragEnd', () => this.scheduleViewWork());
    net.on('afterDrawing', (ctx: CanvasRenderingContext2D) => this.drawBadges(ctx));
  }

  /** Event-count badges, drawn only for visible nodes when zoomed in enough to read them. */
  private drawBadges(ctx: CanvasRenderingContext2D): void {
    const net = this.network;
    if (!net) { return; }
    const scale = net.getScale();
    if (scale < 0.35) { return; }
    const ids: string[] = [];
    for (const d of this.disp.values()) {
      if (d.events > 0 && !d.dim) { ids.push(d.id); }
    }
    if (!ids.length) { return; }
    const pos = net.getPositions(ids);
    ctx.save();
    ctx.font = 'bold 10px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const id of ids) {
      const p = pos[id];
      const d = this.disp.get(id)!;
      if (!p) { continue; }
      const r = d.cluster ? 22 : 15;
      const x = p.x + r * 0.75, y = p.y - r * 0.75;
      const txt = d.events > 99 ? '99+' : String(d.events);
      ctx.beginPath();
      ctx.fillStyle = d.state === 'down' ? '#dc2626' : '#d97706';
      ctx.arc(x, y, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(txt, x, y + 0.5);
    }
    ctx.restore();
  }

  private scheduleViewWork(): void {
    clearTimeout(this.viewTimer);
    this.viewTimer = setTimeout(() => this.loadLinkRates(), 700);
  }

  // ------------------------------------------------------------------ link traffic

  private loadLinkRates(): void {
    clearTimeout(this.linksTimer);
    const net = this.network;
    if (!net || this.destroyed) { return; }
    if (net.getScale() < 0.6 || document.hidden) {
      this.linksTimer = setTimeout(() => this.loadLinkRates(), LINKS_EVERY_MS);
      return;
    }
    const box = this.viewBox();
    const pos = net.getPositions();
    const pairs: [number, string][] = [];
    const seen = new Set<string>();
    for (const e of this.dispEdges.values()) {
      const a = pos[e.from], b = pos[e.to];
      if (!a || !b || !this.inBox(a, box) || !this.inBox(b, box)) { continue; }
      for (const l of e.links) {
        for (const [end, idx] of [[l.a, 0], [l.b, 1]] as [string, number][]) {
          const n = this.map.nodes.get(end);
          if (!n || !n.m || n.id === undefined) { continue; }
          for (const p of l.ps) {
            const key = n.id + '|' + p[idx];
            if (p[idx] && !seen.has(key)) { seen.add(key); pairs.push([n.id, p[idx]]); }
          }
        }
      }
      if (pairs.length >= 600) { break; }
    }
    if (!pairs.length) {
      this.linksTimer = setTimeout(() => this.loadLinkRates(), LINKS_EVERY_MS);
      return;
    }
    this.data_provider.getNetworkLinks(pairs).then((res: any) => {
      if (this.destroyed) { return; }
      for (const [k, v] of Object.entries((res && res.d) || {})) { this.linkRates.set(k, v as number[]); }
      this.render(false);
      this.linksTimer = setTimeout(() => this.loadLinkRates(), LINKS_EVERY_MS);
    }).catch(() => {
      this.linksTimer = setTimeout(() => this.loadLinkRates(), LINKS_EVERY_MS);
    });
  }

  private viewBox(): { x0: number; y0: number; x1: number; y1: number } {
    const net = this.network!;
    const el = this.networkContainer.nativeElement;
    const tl = net.DOMtoCanvas({ x: 0, y: 0 });
    const br = net.DOMtoCanvas({ x: el.clientWidth, y: el.clientHeight });
    return { x0: tl.x, y0: tl.y, x1: br.x, y1: br.y };
  }

  private inBox(p: { x: number; y: number }, b: { x0: number; y0: number; x1: number; y1: number }): boolean {
    return p.x >= b.x0 && p.x <= b.x1 && p.y >= b.y0 && p.y <= b.y1;
  }

  // ------------------------------------------------------------------ interaction

  private onClick(p: any): void {
    this.hideTooltip();
    const id: string | undefined = p.nodes && p.nodes[0];
    const eid: string | undefined = p.edges && p.edges[0];
    if (id) {
      const d = this.disp.get(id);
      if (!d) { return; }
      if (this.pathPicking) {
        if (d.cluster) { this.expandCluster(d.id); return; }
        if (d.node) { this.finishPath(d.node); }
        return;
      }
      if (d.cluster) {
        this.openCluster(d);
      } else if (d.node) {
        this.openNode(d.node);
      }
      return;
    }
    if (eid && !this.pathPicking) {
      const e = this.dispEdges.get(eid);
      if (e) { this.openEdge(e); }
      return;
    }
    if (!this.pathPicking && !this.pathHops.length) {
      this.closePanel();
    }
  }

  private onDoubleClick(p: any): void {
    const id: string | undefined = p.nodes && p.nodes[0];
    if (!id) { return; }
    const d = this.disp.get(id);
    if (!d) { return; }
    if (d.cluster) {
      this.expandCluster(d.id);
    } else if (d.folded && d.node) {
      this.expanded.add('c:cpe:' + d.node.k);
      this.render(false);
    }
  }

  private onDragEnd(p: any): void {
    const ids: string[] = (p.nodes || []).filter((k: string) => !k.startsWith('c:'));
    if (!ids.length || !this.network) { return; }
    const pos = this.network.getPositions(ids);
    for (const k of ids) {
      // grouped views draw a node moved with its group: store its own (ungrouped) position
      const off = this.map.offsets.get(k) || [0, 0];
      const xy = [Math.round(pos[k].x - off[0]), Math.round(pos[k].y - off[1])];
      this.map.mine[k] = xy;
      this.pendingLayout[k] = xy;
      const d = this.disp.get(k);
      if (d) { d.x = Math.round(pos[k].x); d.y = Math.round(pos[k].y); }
      this.nodeSig.delete(k);   // keep the next diff honest
    }
    clearTimeout(this.layoutSaveTimer);
    this.layoutSaveTimer = setTimeout(() => this.flushLayout(), 1500);
  }

  private flushLayout(): void {
    const set = this.pendingLayout;
    if (!Object.keys(set).length) { return; }
    this.pendingLayout = {};
    this.data_provider.saveNetworkLayout({ mode: this.layoutMode, set }).catch(() => undefined);
  }

  resetMyLayout(): void {
    this.data_provider.saveNetworkLayout({ mode: this.layoutMode, clear: true }).then(() => {
      this.map.mine = {};
      this.nodeSig.clear();
      this.nodesDs.clear();
      this.edgesDs.clear();
      this.edgeSig.clear();
      this.render(true);
    });
  }

  setLayoutMode(m: LayoutMode): void {
    if (m === this.layoutMode) { return; }
    this.flushLayout();
    this.layoutMode = m;
    this.savePrefs();
    this.map.version = '';
    this.nodeSig.clear();
    this.edgeSig.clear();
    this.nodesDs.clear();
    this.edgesDs.clear();
    this.data_provider.getNetworkGraph({ mode: m }).then((res: any) => {
      if (res && res.nodes) {
        this.map.load(res as GraphPayload);
        this.dropUnknownGroups();
        this.render(true);
      }
    });
  }

  setGroupMode(m: GroupMode): void {
    this.groupMode = m;
    this.expanded.clear();
    this.savePrefs();
    this.render(true);
  }

  expandCluster(id: string): void {
    this.expanded.add(id);
    if (this.panelDisp && this.panelDisp.id === id) { this.closePanel(); }
    this.render(false);
    const d = this.disp.get(id);
    if (!d && this.network) {
      // zoom onto the opened members
      const members = [...this.disp.values()].filter(x => x.node && this.map.clusterOf(x.node, this.groupMode, new Set()) === id).map(x => x.id);
      if (members.length) { this.network.fit({ nodes: members, animation: { duration: 400, easingFunction: 'easeInOutQuad' } }); }
    }
  }

  collapseAll(): void {
    this.expanded.clear();
    this.render(true);
  }

  fit(): void {
    this.network?.fit({ animation: { duration: 400, easingFunction: 'easeInOutQuad' } });
  }

  // ------------------------------------------------------------------ tooltip

  private showTooltip(id: string, ev: any): void {
    const el = this.tooltipEl.nativeElement;
    const d = this.disp.get(id);
    if (!d) { return; }
    const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);
    let html = '';
    if (d.cluster) {
      html = '<b>' + esc(d.label) + '</b><div>' + d.total + ' devices' + (d.down ? ' · <span class="t-down">' + d.down + ' down</span>' : '') +
        (d.warn ? ' · <span class="t-warn">' + d.warn + ' with warnings</span>' : '') + '</div><div class="t-hint">Double-click to open</div>';
    } else if (d.node) {
      const n = d.node;
      const s = n.id !== undefined ? this.map.status.get(n.id) : undefined;
      html = '<b>' + esc(n.n) + '</b>';
      if (n.lk) {
        html += '<div>No access to this device</div>';
      } else {
        html += '<div>' + esc(n.ip || '') + (n.md ? ' · ' + esc(n.md) : '') + '</div>';
        if (s) {
          html += '<div><span class="t-dot" style="background:' + STATE_COLOR[s.state] + '"></span>' + STATE_LABEL[s.state] +
            (s.state === 'down' && s.since ? ' for ' + fmtDuration(this.now - s.since) : '') +
            (s.uptime ? ' · up ' + fmtDuration(s.uptime) : '') + '</div>';
          html += '<div>CPU ' + (s.cpu ?? '-') + '% · mem ' + (s.mem ?? '-') + '% · RouterOS ' + esc(s.fw || '-') + '</div>';
          if (s.ev) { html += '<div class="t-warn">' + s.ev + ' open event' + (s.ev > 1 ? 's' : '') + (s.worst ? ' (' + esc(s.worst) + ')' : '') + '</div>'; }
        } else if (!n.m) {
          html += '<div>Discovered ' + esc(TYPE_LABEL[n.t || 'unknown'] || n.t) + (n.ver ? ' · ' + esc(n.ver) : '') + ' · not managed</div>';
        }
        if (d.folded) { html += '<div class="t-hint">+' + d.folded + ' CPE folded · double-click to show</div>'; }
      }
    }
    el.innerHTML = html;
    const rect = this.networkContainer.nativeElement.getBoundingClientRect();
    const x = (ev?.center?.x ?? ev?.pointer?.DOM?.x ?? 0);
    const y = (ev?.center?.y ?? ev?.pointer?.DOM?.y ?? 0);
    const px = ev && ev.clientX !== undefined ? ev.clientX - rect.left : x;
    const py = ev && ev.clientY !== undefined ? ev.clientY - rect.top : y;
    el.style.left = Math.min(rect.width - 260, px + 16) + 'px';
    el.style.top = Math.min(rect.height - 120, py + 12) + 'px';
    el.style.display = 'block';
  }

  private hideTooltip(): void {
    const el = this.tooltipEl?.nativeElement;
    if (el) { el.style.display = 'none'; }
  }

  // ------------------------------------------------------------------ panels

  closePanel(): void {
    this.panelKind = null;
    this.panelNode = null;
    this.panelDisp = null;
    this.panelEdge = null;
    this.panelData = null;
    this.pingResult = null;
    if (!this.pathHops.length && this.focusNodes) {
      this.clearFocus();
    }
    this.network?.unselectAll();
  }

  openNode(n: GraphNode, focus = false): void {
    this.panelNode = n;
    this.panelDisp = null;
    this.panelEdge = null;
    this.pingResult = null;
    this.panelData = null;
    this.sparks = {};
    if (n.lk) { this.panelKind = 'locked'; return; }
    if (!n.m || n.id === undefined) { this.panelKind = 'discovered'; return; }
    this.panelKind = 'device';
    this.panelLoading = true;
    const id = n.id;
    this.data_provider.getNetworkDevice(id).then((res: any) => {
      if (this.panelNode !== n) { return; }
      this.panelLoading = false;
      if (res && !res.err && res.status !== 'failed') {
        this.panelData = res;
        this.sparks = {};
        for (const [k, pts] of Object.entries(res.spark || {})) { this.sparks[k] = this.sparkPath(pts as number[][]); }
      }
    }).catch(() => { this.panelLoading = false; });
    if (focus) { this.focusNeighbours(n.k); }
  }

  openCluster(d: DisplayNode): void {
    this.panelKind = 'cluster';
    this.panelDisp = d;
    this.panelNode = null;
    this.panelEdge = null;
  }

  openEdge(e: DisplayEdge): void {
    this.panelKind = 'link';
    this.panelEdge = e;
    this.panelNode = null;
    this.panelDisp = null;
  }

  clusterMembers(d: DisplayNode): { node: GraphNode; s: DevStatus | undefined }[] {
    const out = (d.members || []).map(k => this.map.nodes.get(k)!).filter(n => !!n)
      .map(n => ({ node: n, s: n.id !== undefined ? this.map.status.get(n.id) : undefined }));
    const rank = (x: { s: DevStatus | undefined }) => x.s ? ({ down: 0, degraded: 1, warn: 2, maint: 3, unknown: 4, up: 5 } as any)[x.s.state] : 6;
    out.sort((a, b) => rank(a) - rank(b) || a.node.n.localeCompare(b.node.n));
    return out.slice(0, 200);
  }

  edgeLinks(e: DisplayEdge): { a: GraphNode; b: GraphNode; ports: string; rate: string }[] {
    return e.links.slice(0, 50).map(l => {
      const a = this.map.nodes.get(l.a)!, b = this.map.nodes.get(l.b)!;
      return { a, b, ports: this.map.ports(l, l.a), rate: this.linkRateText(l) };
    });
  }

  private linkRateText(l: GraphLink): string {
    for (const [end, idx] of [[l.a, 0], [l.b, 1]] as [string, number][]) {
      const n = this.map.nodes.get(end);
      if (!n || !n.m || n.id === undefined) { continue; }
      for (const p of l.ps) {
        const r = this.linkRates.get(n.id + '|' + p[idx]);
        if (r) { return '↓ ' + fmtBps(r[0]) + '  ↑ ' + fmtBps(r[1]) + ' (on ' + n.n + ' ' + p[idx] + ')'; }
      }
    }
    return 'zoom in to load traffic';
  }

  statusOf(n: GraphNode | null): DevStatus | undefined {
    return n && n.id !== undefined ? this.map.status.get(n.id) : undefined;
  }

  neighbourList(n: GraphNode): { node: GraphNode; ports: string; state: string | null }[] {
    return (this.map.adj.get(n.k) || []).map(k => {
      const o = this.map.nodes.get(k)!;
      const l = this.map.linkBetween(n.k, k);
      return { node: o, ports: l ? this.map.ports(l, n.k) : '', state: this.map.stateOf(o) };
    }).sort((a, b) => (b.node.m || 0) - (a.node.m || 0) || a.node.n.localeCompare(b.node.n)).slice(0, 100);
  }

  locate(n: GraphNode): void {
    this.map.expandFor([n.k], this.groupMode, this.expanded);
    if (this.filterMode === 'hide' && !this.map.matches(n, this.filters)) {
      this.filterMode = 'dim';
    }
    this.render(false);
    const id = this.ownerOfKey.get(n.k) || n.k;
    this.zone.runOutsideAngular(() => {
      this.network?.selectNodes([id]);
      this.network?.focus(id, { scale: Math.max(1.1, this.network.getScale()), animation: { duration: 500, easingFunction: 'easeInOutQuad' } });
    });
    this.openNode(n, true);
  }

  focusNeighbours(k: string): void {
    this.focusKey = k;
    this.pathKeys = [];
    this.render(false);
  }

  clearFocus(): void {
    this.focusKey = null;
    this.pathKeys = [];
    this.focusNodes = null;
    this.focusEdges = null;
    this.render(false);
  }

  /** Highlights follow what is drawn now (groups open/close, filters, layout changes). */
  private recomputeFocus(): void {
    const own = (k: string) => this.ownerOfKey.get(k) || k;
    if (this.pathKeys.length) {
      const nodes = new Set<string>(), edges = new Set<string>();
      for (let i = 0; i < this.pathKeys.length; i++) {
        const id = own(this.pathKeys[i]);
        nodes.add(id);
        if (i > 0) {
          const a = own(this.pathKeys[i - 1]);
          if (a !== id) { edges.add(a < id ? a + '|' + id : id + '|' + a); }
        }
      }
      this.focusNodes = nodes;
      this.focusEdges = edges;
    } else if (this.focusKey) {
      const id = own(this.focusKey);
      const nodes = new Set<string>([id]), edges = new Set<string>();
      for (const e of this.dispEdges.values()) {
        if (e.from === id || e.to === id) { edges.add(e.id); nodes.add(e.from); nodes.add(e.to); }
      }
      this.focusNodes = nodes;
      this.focusEdges = edges;
    } else {
      this.focusNodes = null;
      this.focusEdges = null;
    }
  }

  // ------------------------------------------------------------------ search

  onSearch(): void {
    this.searchResults = this.map.search(this.searchText, 20);
    this.searchOpen = this.searchResults.length > 0 || !!this.searchText;
    this.searchIdx = 0;
  }

  onSearchKey(ev: KeyboardEvent): void {
    if (ev.key === 'ArrowDown') { this.searchIdx = Math.min(this.searchResults.length - 1, this.searchIdx + 1); ev.preventDefault(); }
    if (ev.key === 'ArrowUp') { this.searchIdx = Math.max(0, this.searchIdx - 1); ev.preventDefault(); }
    if (ev.key === 'Enter' && this.searchResults[this.searchIdx]) { this.pickSearch(this.searchResults[this.searchIdx]); }
    if (ev.key === 'Escape') { this.searchOpen = false; (ev.target as HTMLElement).blur(); }
  }

  pickSearch(n: GraphNode): void {
    this.searchOpen = false;
    this.searchText = '';
    if (this.pathPicking) { this.finishPath(n); return; }
    this.locate(n);
  }

  // ------------------------------------------------------------------ filters

  toggleState(s: string): void {
    this.filters.states[s] = !this.filters.states[s];
    this.applyFilters();
  }

  onlyState(s: string): void {
    this.filters.states = { [s]: true };
    this.leftOpen = true;
    this.leftTab = 'filters';
    this.applyFilters();
  }

  toggleKind(k: string): void {
    this.filters.kinds[k] = !this.filters.kinds[k];
    this.applyFilters();
  }

  toggleType(t: string): void {
    this.filters.types[t] = !this.filters.types[t];
    this.applyFilters();
  }

  toggleGroup(id: number): void {
    const i = this.filters.groups.indexOf(id);
    if (i >= 0) { this.filters.groups.splice(i, 1); } else { this.filters.groups.push(id); }
    this.applyFilters();
  }

  clearFilters(): void {
    this.filters = emptyFilters();
    this.applyFilters();
  }

  applyFilters(): void {
    this.updateFilterCount();
    this.savePrefs();
    this.render(false);
  }

  /** Group picks saved earlier that this user can no longer see (or pick) would filter
   *  the map invisibly: drop them. */
  private buildManagedList(): void {
    this.managedList = [...this.map.nodes.values()]
      .filter(n => n.m && n.id !== undefined && !n.lk)
      .map(n => ({ id: n.id!, label: n.n + (n.ip ? ' — ' + n.ip : '') }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  private dropUnknownGroups(): void {
    const known = new Set(this.map.groups.map(g => g.id));
    const keep = this.filters.groups.filter(id => known.has(id));
    if (keep.length !== this.filters.groups.length) {
      this.filters.groups = keep;
      this.updateFilterCount();
      this.savePrefs();
    }
  }

  private updateFilterCount(): void {
    const f = this.filters;
    this.filterCount = Object.values(f.states).filter(v => v).length + Object.values(f.kinds).filter(v => v).length +
      Object.values(f.types).filter(v => v).length + (f.eventsOnly ? 1 : 0) + (f.updatesOnly ? 1 : 0) +
      (f.cpuAbove !== null ? 1 : 0) + (f.memAbove !== null ? 1 : 0) + (f.version ? 1 : 0) + f.groups.length;
  }

  // ------------------------------------------------------------------ path

  startPath(n: GraphNode): void {
    this.pathFrom = n;
    this.pathPicking = true;
    this.pathHops = [];
    this.panelKind = 'path';
    this.searchText = '';
    this.searchResults = [];
    setTimeout(() => this.searchBox?.nativeElement.focus(), 0);
  }

  finishPath(to: GraphNode): void {
    if (!this.pathFrom) { return; }
    const keys = this.map.path(this.pathFrom.k, to.k);
    this.pathPicking = false;
    this.panelKind = 'path';
    if (!keys.length) {
      this.pathHops = [];
      this.errorMsg = 'No known path between ' + this.pathFrom.n + ' and ' + to.n + '.';
      setTimeout(() => { this.errorMsg = ''; }, 5000);
      return;
    }
    this.map.expandFor(keys, this.groupMode, this.expanded);
    const hops: PathHop[] = [];
    for (let i = 0; i < keys.length; i++) {
      const n = this.map.nodes.get(keys[i])!;
      const prev = i > 0 ? keys[i - 1] : null;
      const l = prev ? this.map.linkBetween(prev, keys[i]) : undefined;
      hops.push({ node: n, state: this.map.stateOf(n), ports: l ? this.map.ports(l, prev!) : '', rate: l ? this.linkRateText(l) : '' });
    }
    this.pathHops = hops;
    this.pathKeys = keys;
    this.focusKey = null;
    this.render(false);
    this.network?.fit({ nodes: [...(this.focusNodes || [])], animation: { duration: 500, easingFunction: 'easeInOutQuad' } });
  }

  clearPath(): void {
    this.pathFrom = null;
    this.pathPicking = false;
    this.pathHops = [];
    this.pathKeys = [];
    this.closePanel();
    this.clearFocus();
  }

  // ------------------------------------------------------------------ actions

  ping(n: GraphNode): void {
    if (n.id === undefined) { return; }
    this.pinging = true;
    this.pingResult = null;
    this.data_provider.pingDevice(n.id, '', 4).then((res: any) => {
      this.pinging = false;
      this.pingResult = res;
    }).catch(() => { this.pinging = false; this.pingResult = { failed: true }; });
  }

  openDevicePage(n: GraphNode): void {
    if (n.id !== undefined) { window.open(`/#/device-stats;id=${n.id}`, '_blank'); }
  }

  webAccess(n: GraphNode): void {
    this.accessTarget = { id: n.m && n.id !== undefined ? n.id : null, ip: n.ip || '', mikrotik: (n.b || 'MikroTik') === 'MikroTik' };
    this.showWebAccessModal = true;
  }

  openProxyAccess(): void {
    const t = this.accessTarget;
    if (!t) { return; }
    if (t.id !== null) {
      window.open(`/api/proxy/init?devid=${t.id}`, '_blank');
    } else if (t.ip) {
      window.open(`/api/proxy/init?dev_ip=${t.ip}`, '_blank');
    }
    this.showWebAccessModal = false;
  }

  openDirectAccess(): void {
    if (this.accessTarget?.ip) { window.open(`http://${this.accessTarget.ip}`, '_blank'); }
    this.showWebAccessModal = false;
  }

  openWebboxAccess(): void {
    const devId = this.accessTarget?.id;
    if (devId === null || devId === undefined) { return; }
    this.showWebAccessModal = false;
    this.data_provider.MikroWizardRPC.sendJsonRequest('/api/terminal/init', {
      device_id: devId, protocol: 'winbox', connection_type: 'winbox',
    }).then((res: any) => {
      if (res && res.token) {
        window.open(res.web_url || ('/terminal-ws/winbox.html?token=' + res.token), '_blank');
      } else if (res && res.status === 'gateway_update_required') {
        this.gatewayNoticeType = 'update_required';
        this.gatewayNoticeTitle = 'Terminal Gateway Update Required';
        this.gatewayNoticeMessage = res.error || 'Your Terminal Gateway container is outdated and does not support WebBox. Please update the Terminal Gateway Docker container to the latest version to use this feature.';
        this.gatewayNoticeDocUrl = res.doc_url || 'https://mikrowizard.com/docs/updating-terminal-gateway-addon/';
        this.showGatewayNoticeModal = true;
      } else if (res && res.status === 'gateway_not_installed') {
        this.gatewayNoticeType = 'not_installed';
        this.gatewayNoticeTitle = 'Terminal Gateway Not Installed';
        this.gatewayNoticeMessage = res.error || 'The MikroWizard Terminal Gateway addon is required to start WebBox sessions. Please ask your administrator to install it.';
        this.gatewayNoticeDocUrl = res.doc_url || 'https://mikrowizard.com/docs/installing-terminal-gatway-addon/';
        this.showGatewayNoticeModal = true;
      } else {
        alert(res?.error || 'Failed to initialize WebBox session.');
      }
    }).catch(() => alert('Failed to initialize WebBox session.'));
  }

  copy(text: string | undefined): void {
    if (text && navigator.clipboard) { navigator.clipboard.writeText(text).catch(() => undefined); }
  }

  confirmResetMap(): void {
    this.showResetModal = false;
    this.loading = true;
    this.data_provider.resetNetworkMap().then((res: any) => {
      if (res.status === 'success') {
        this.map = new NetMap();
        this.nodeSig.clear(); this.edgeSig.clear(); this.nodesDs.clear(); this.edgesDs.clear();
        this.closePanel();
        this.loadGraph(true, true);
      } else {
        this.loading = false;
        alert("Error: " + (res.error || res.err || "Failed to reset map"));
      }
    }).catch((err: any) => {
      this.loading = false;
      alert("Error resetting map: " + err);
    });
  }

  // ------------------------------------------------------------------ export

  exportPng(): void {
    const canvas = this.networkContainer.nativeElement.querySelector('canvas');
    if (!canvas) { return; }
    const out = document.createElement('canvas');
    out.width = canvas.width;
    out.height = canvas.height + 40;
    const ctx = out.getContext('2d')!;
    ctx.fillStyle = this.dark ? '#111827' : '#ffffff';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(canvas, 0, 40);
    ctx.fillStyle = this.dark ? '#e5e7eb' : '#111827';
    ctx.font = '600 16px Inter, Arial, sans-serif';
    const c = this.counts;
    ctx.fillText('MikroWizard network map · ' + new Date().toLocaleString() + ' · ' + (c['managed'] || 0) + ' managed, ' +
      (c['down'] || 0) + ' down, ' + ((c['warn'] || 0) + (c['degraded'] || 0)) + ' with problems', 16, 26);
    this.download(out.toDataURL('image/png'), 'network-map-' + this.stamp() + '.png');
  }

  exportCsv(): void {
    const rows = [['name', 'ip', 'mac', 'managed', 'type', 'brand', 'model', 'state', 'open_events', 'cpu', 'mem', 'routeros', 'uptime_s', 'parent']];
    for (const n of this.map.nodes.values()) {
      if (!this.map.matches(n, this.filters)) { continue; }
      const s = n.id !== undefined ? this.map.status.get(n.id) : undefined;
      const parent = n.p ? this.map.nodes.get(n.p)?.n || '' : '';
      rows.push([n.n, n.ip || '', n.mac || '', n.m ? 'yes' : (n.lk ? 'restricted' : 'no'), n.t || '', n.b || '', n.md || '',
        s ? s.state : '', s ? String(s.ev) : '', s && s.cpu !== null ? String(s.cpu) : '', s && s.mem !== null ? String(s.mem) : '',
        s ? s.fw : (n.ver || ''), s && s.uptime !== null ? String(s.uptime) : '', parent]);
    }
    const csv = rows.map(r => r.map(v => /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v).join(',')).join('\n');
    this.download('data:text/csv;charset=utf-8,' + encodeURIComponent(csv), 'network-devices-' + this.stamp() + '.csv');
  }

  private download(url: string, name: string): void {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  private stamp(): string {
    return new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  }

  // ------------------------------------------------------------------ NOC mode & keys

  toggleNoc(): void {
    this.noc = !this.noc;
    const el = this.shellEl.nativeElement;
    if (this.noc && el.requestFullscreen && !document.fullscreenElement) {
      el.requestFullscreen().catch(() => undefined);
    } else if (!this.noc && document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    }
    this.render(false);
    setTimeout(() => { this.network?.redraw(); this.fit(); }, 300);
  }

  @HostListener('document:fullscreenchange')
  onFullscreenChange(): void {
    if (!document.fullscreenElement && this.noc) { this.noc = false; this.render(false); }
  }

  @HostListener('document:keydown', ['$event'])
  onKey(ev: KeyboardEvent): void {
    const tag = (ev.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || ev.ctrlKey || ev.metaKey || ev.altKey) { return; }
    if (ev.key === '/') { ev.preventDefault(); this.searchBox?.nativeElement.focus(); }
    else if (ev.key === 'f') { this.fit(); }
    else if (ev.key === 'n') { this.toggleNoc(); }
    else if (ev.key === 'p') { this.leftOpen = true; this.leftTab = 'problems'; }
    else if (ev.key === '?') { this.showHelp = !this.showHelp; }
    else if (ev.key === 'Escape') {
      if (this.showHelp) { this.showHelp = false; return; }
      if (this.pathPicking || this.pathHops.length) { this.clearPath(); } else { this.closePanel(); this.clearFocus(); }
    }
  }

  // ------------------------------------------------------------------ neighbour -> managed device

  managedName(id: number | undefined): string {
    if (id === undefined) { return ''; }
    return this.map.nodes.get('d:' + id)?.n || ('device ' + id);
  }

  whyText(n: GraphNode): string {
    const w = n.why;
    if (!w) { return ''; }
    if (w.r === 'same-name') {
      return 'Its name matches ' + (w.d && w.d.length ? w.d.length + ' ' : 'several ') +
        'managed devices, so MikroWizard cannot tell which one it is.';
    }
    if (w.r === 'board') {
      return 'Same name as ' + this.managedName(w.d?.[0]) + ', but it reports board "' + (n.md || '?') +
        '" while that device is a ' + (w.bm || 'different model') + '.';
    }
    if (w.r === 'default-name') {
      return 'It still has a factory-default name, so it cannot be recognised by name.';
    }
    return '';
  }

  /** Link the open discovered node to managed device id (from a suggestion or the picker). */
  linkAlias(n: GraphNode, id?: number): void {
    if (id === undefined) {
      const hit = this.managedList.find(m => m.label === this.aliasPick.trim());
      if (!hit) { this.errorMsg = 'Pick a managed device from the list.'; setTimeout(() => { this.errorMsg = ''; }, 4000); return; }
      id = hit.id;
    }
    const macs = [n.mac, ...(n.macs || [])].filter(m => !!m) as string[];
    const swids = n.sw ? [n.sw] : [];
    this.aliasBusy = true;
    this.data_provider.setNetworkAlias({ devid: id, macs, swids }).then((res: any) => {
      this.aliasBusy = false;
      if (res && res.status === 'success') {
        this.aliasPick = '';
        const target = id;
        this.closePanel();
        this.reloadThenLocate(target);
      } else {
        this.errorMsg = (res && (res.error || res.err)) || 'Could not link the device.';
        setTimeout(() => { this.errorMsg = ''; }, 5000);
      }
    }).catch(() => { this.aliasBusy = false; });
  }

  unlinkAlias(devid: number, value: string, kind: 'macs' | 'swids'): void {
    this.data_provider.setNetworkAlias({ devid, [kind]: [value], remove: true }).then((res: any) => {
      if (res && res.status === 'success' && this.panelData) {
        this.panelData.aliases = { macs: res.macs || [], swids: res.swids || [] };
        this.loadGraph(false, true);
      }
    });
  }

  private reloadThenLocate(devid: number): void {
    this.data_provider.getNetworkGraph({ mode: this.layoutMode, force: true }).then((res: any) => {
      if (res && res.nodes) {
        this.map.load(res as GraphPayload);
        this.buildManagedList();
        this.render(false);
        const n = this.map.nodes.get('d:' + devid);
        if (n) { this.locate(n); }
      }
    });
  }

  // ------------------------------------------------------------------ problems panel

  rebuildProblems(): void {
    this.pvSections = problemSections(this.map, this.problems, this.pv);
    this.pvRows = this.pvSections.reduce((a, x) => a + x.rows.length, 0);
  }

  setPv(key: 'groupBy' | 'sort', v: any): void {
    (this.pv as any)[key] = v;
    this.pvLimit.clear();
    this.rebuildProblems();
    this.savePrefs();
  }

  togglePvState(st: string): void {
    this.pv.states[st] = !this.pv.states[st];
    this.pvLimit.clear();
    this.rebuildProblems();
  }

  /** Sections start open while the list is short; a big outage starts folded. */
  secOpen(sec: ProblemSection): boolean {
    const v = this.pvSecOpen.get(sec.key);
    if (v !== undefined) { return v; }
    return this.pvSections.length <= 4 || this.pvRows <= 40 || sec === this.pvSections[0];
  }

  toggleSec(sec: ProblemSection): void {
    this.pvSecOpen.set(sec.key, !this.secOpen(sec));
  }

  secLimit(sec: ProblemSection): number {
    return this.pvLimit.get(sec.key) || (sec.title ? 15 : 50);
  }

  secRows(sec: ProblemSection): ProblemRow[] {
    return sec.rows.slice(0, this.secLimit(sec));
  }

  moreRows(sec: ProblemSection): void {
    this.pvLimit.set(sec.key, this.secLimit(sec) + 50);
  }

  behindOpen(r: ProblemRow): boolean {
    return this.pvBehindOpen.has(r.node.k);
  }

  toggleBehind(r: ProblemRow): void {
    if (this.pvBehindOpen.has(r.node.k)) { this.pvBehindOpen.delete(r.node.k); } else { this.pvBehindOpen.add(r.node.k); }
  }

  /** Put only the problem devices on the map (status bar style shortcut). */
  problemsOnMap(): void {
    const on = this.problemStates.filter(x => this.pv.states[x]);
    this.filters.states = {};
    for (const x of (on.length ? on : ['down', 'degraded', 'warn'])) { this.filters.states[x] = true; }
    this.applyFilters();
  }

  locateArea(sec: ProblemSection): void {
    if (sec.head) { this.locate(sec.head); }
  }

  trackSec(_i: number, sec: ProblemSection): string {
    return sec.key;
  }

  // ------------------------------------------------------------------ template helpers

  ago(epoch: number | null | undefined): string {
    return fmtAgo(epoch, this.now);
  }

  since(s: DevStatus | undefined): string {
    return s && s.since ? fmtDuration(this.now - s.since) : '';
  }

  pct(v: number | null | undefined): number {
    return v === null || v === undefined ? 0 : Math.max(0, Math.min(100, v));
  }

  levelClass(level: string | null | undefined): string {
    const l = (level || '').toLowerCase();
    return l === 'critical' ? 'lv-crit' : (l === 'error' ? 'lv-err' : (l === 'warning' ? 'lv-warn' : 'lv-info'));
  }

  private sparkPath(pts: number[][]): string {
    const vals = pts.filter(p => p[1] !== null && p[1] !== undefined);
    if (vals.length < 2) { return ''; }
    const xs = vals.map(p => p[0]), ys = vals.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y1 = Math.max(...ys, 1);
    return vals.map((p, i) => (i ? 'L' : 'M') + ((p[0] - x0) / Math.max(1, x1 - x0) * 196 + 2).toFixed(1) + ' ' + (30 - p[1] / y1 * 26).toFixed(1)).join(' ');
  }

  sparkMax(k: string): string {
    const pts: number[][] = (this.panelData?.spark || {})[k] || [];
    const m = Math.max(0, ...pts.map(p => p[1] || 0));
    return k === 'cpu-load' ? Math.round(m) + '%' : fmtBps(m);
  }

  trackKey(_i: number, x: any): string {
    return x.node ? x.node.k : (x.k || x.id || _i);
  }
}
