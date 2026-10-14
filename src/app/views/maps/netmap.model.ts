// netmap.model.ts - network map v2: data model, grouping, filters, search, path finding.
// Pure TypeScript (no Angular, no vis-network) so it can be tested on its own.

export type DevState = 'up' | 'down' | 'degraded' | 'warn' | 'maint' | 'unknown';
export type GroupMode = 'none' | 'area' | 'router' | 'subnet';
export type FilterMode = 'dim' | 'hide';

export interface GraphNode {
  k: string;            // stable key: d:<device id> | m:<mac>
  id?: number;          // managed device id
  n: string;            // name
  ip?: string;
  mac?: string;
  t?: string;           // router | switch | ap | cpe | radio | server | vm | unknown
  b?: string;           // brand
  md?: string;          // model / board
  ver?: string;
  plat?: string;
  m?: number;           // 1 = managed by MikroWizard
  lk?: number;          // 1 = locked (no permission)
  p?: string;           // BFS parent key
  dp?: number;          // depth from the core
  ar?: string;          // area head key
  lf?: number;          // 1 = leaf CPE drawn round its router
  sw?: string;          // RouterOS software-id (discovered MikroTik)
  macs?: string[];      // other MACs the same discovered device was seen with
  why?: { r: string; d?: number[]; bm?: string };   // why it was not merged with a managed device
}

export interface GraphLink { a: string; b: string; ps: string[][]; }   // ps: [portOnA, portOnB, bridge]

export interface GraphPayload {
  v: string; mode: string; nodes: GraphNode[]; links: GraphLink[]; cores: string[];
  layout: { [k: string]: number[] }; mine: { [k: string]: number[] };
  groups: { id: number; n: string }[]; gm: { [devid: string]: number[] };
}

export interface DevStatus {
  state: DevState; ev: number; worst: string | null; cpu: number | null; mem: number | null;
  uptime: number | null; rx: number | null; tx: number | null; fw: string; upd: number;
  seen: number | null; since: number | null;
}

export interface Filters {
  states: { [s: string]: boolean };       // empty = all
  kinds: { [k: string]: boolean };        // managed | discovered | locked
  types: { [t: string]: boolean };
  eventsOnly: boolean;
  updatesOnly: boolean;
  cpuAbove: number | null;
  memAbove: number | null;
  version: string;
  groups: number[];                       // "Show": device groups (empty = all)
}

export function emptyFilters(): Filters {
  return { states: {}, kinds: {}, types: {}, eventsOnly: false, updatesOnly: false,
           cpuAbove: null, memAbove: null, version: '', groups: [] };
}

export const ALL_DEVICES_GROUP = 1;

export const STATE_ORDER: DevState[] = ['down', 'degraded', 'warn', 'maint', 'unknown', 'up'];
export const STATE_LABEL: { [s: string]: string } = {
  up: 'Up', down: 'Down', degraded: 'Degraded', warn: 'Warning', maint: 'Maintenance', unknown: 'Unknown',
};
export const STATE_RANK: { [s: string]: number } = { down: 5, degraded: 4, warn: 3, maint: 2, unknown: 1, up: 0 };
export const TYPE_LABEL: { [t: string]: string } = {
  router: 'Router', switch: 'Switch', ap: 'Access point', cpe: 'CPE / radio', radio: 'Radio',
  server: 'Server', vm: 'Virtual machine', unknown: 'Unknown',
};

export interface DisplayNode {
  id: string;           // node key or cluster id (c:...)
  cluster: boolean;
  label: string;
  members?: string[];   // cluster members (node keys)
  node?: GraphNode;
  x: number; y: number;
  state: DevState | null;     // worst state for clusters, own state for managed nodes
  dim: boolean;
  events: number;
  down: number; warn: number; total: number; folded: number;   // cluster/fold counts
}

export type ProblemGroupBy = 'cause' | 'area' | 'none';
export type ProblemSort = 'severity' | 'longest' | 'newest' | 'name';

export interface ProblemRow {
  node: GraphNode;
  s: DevStatus;
  /** down devices that sit behind this one (only for root-cause rows) */
  behind: { node: GraphNode; s: DevStatus }[];
}

export interface ProblemSection {
  key: string;
  title: string;
  head?: GraphNode;           // area head, to locate the area
  rows: ProblemRow[];
  total: number;              // problem devices in the section (incl. behind)
  down: number;
  warn: number;               // degraded + warn
}

export interface ProblemQuery {
  groupBy: ProblemGroupBy;
  sort: ProblemSort;
  states: { [s: string]: boolean };   // empty = all problem states
  text: string;
}

export interface DisplayEdge {
  id: string; from: string; to: string; count: number; links: GraphLink[]; dim: boolean;
}

export class NetMap {
  nodes = new Map<string, GraphNode>();
  links: GraphLink[] = [];
  cores: string[] = [];
  adj = new Map<string, string[]>();
  children = new Map<string, string[]>();
  base: { [k: string]: number[] } = {};
  mine: { [k: string]: number[] } = {};
  groups: { id: number; n: string }[] = [];
  groupMembers = new Map<number, Set<number>>();
  status = new Map<number, DevStatus>();
  version = '';
  layoutMode = 'radial';
  /** display offset of each drawn node in grouped views (display = real + offset) */
  offsets = new Map<string, number[]>();
  private searchIdx: { k: string; s: string }[] = [];

  load(g: GraphPayload): void {
    this.version = g.v;
    this.layoutMode = g.mode || 'radial';
    this.nodes.clear();
    this.adj.clear();
    this.children.clear();
    for (const n of g.nodes) {
      this.nodes.set(n.k, n);
      this.adj.set(n.k, []);
    }
    this.links = g.links.filter(l => this.nodes.has(l.a) && this.nodes.has(l.b));
    for (const l of this.links) {
      this.adj.get(l.a)!.push(l.b);
      this.adj.get(l.b)!.push(l.a);
    }
    for (const n of g.nodes) {
      if (n.p && this.nodes.has(n.p)) {
        if (!this.children.has(n.p)) { this.children.set(n.p, []); }
        this.children.get(n.p)!.push(n.k);
      }
    }
    this.cores = g.cores || [];
    this.base = g.layout || {};
    this.mine = g.mine || {};
    this.groups = g.groups || [];
    this.groupMembers.clear();
    for (const [dev, gids] of Object.entries(g.gm || {})) {
      for (const gid of gids) {
        if (!this.groupMembers.has(gid)) { this.groupMembers.set(gid, new Set()); }
        this.groupMembers.get(gid)!.add(+dev);
      }
    }
    this.searchIdx = g.nodes.map(n => ({
      k: n.k,
      s: [n.n, n.ip || '', n.mac || '', n.md || '', n.ver || '', n.b || '', n.lk ? 'restricted' : '']
        .join(' ').toLowerCase(),
    }));
  }

  setStatus(cols: string[], d: { [id: string]: any[] }): Set<number> {
    const changed = new Set<number>();
    const idx = (c: string) => cols.indexOf(c);
    const I = {
      state: idx('state'), ev: idx('ev'), worst: idx('worst'), cpu: idx('cpu'), mem: idx('mem'),
      uptime: idx('uptime'), rx: idx('rx'), tx: idx('tx'), fw: idx('fw'), upd: idx('upd'),
      seen: idx('seen'), since: idx('since'),
    };
    for (const [id, row] of Object.entries(d)) {
      const s: DevStatus = {
        state: row[I.state], ev: row[I.ev] || 0, worst: row[I.worst], cpu: row[I.cpu], mem: row[I.mem],
        uptime: row[I.uptime], rx: row[I.rx], tx: row[I.tx], fw: row[I.fw] || '', upd: row[I.upd] || 0,
        seen: row[I.seen], since: row[I.since],
      };
      const old = this.status.get(+id);
      if (!old || old.state !== s.state || old.ev !== s.ev || old.worst !== s.worst) { changed.add(+id); }
      this.status.set(+id, s);
    }
    return changed;
  }

  stateOf(n: GraphNode): DevState | null {
    if (!n.m || n.id === undefined) { return null; }
    return this.status.get(n.id)?.state || 'unknown';
  }

  pos(k: string): number[] {
    return this.mine[k] || this.base[k] || [0, 0];
  }

  /** Does the node pass the filters? (scope groups included) */
  matches(n: GraphNode, f: Filters): boolean {
    // group 1 ("Default") is MikroWizard's all-devices group: picking it limits nothing
    if (f.groups.length && f.groups.indexOf(ALL_DEVICES_GROUP) < 0) {
      const inGroups = (x: GraphNode | undefined) =>
        !!x && !!x.m && x.id !== undefined && f.groups.some(g => this.groupMembers.get(g)?.has(x.id!));
      if (n.m && n.id !== undefined && !n.lk) {
        if (!inGroups(n)) { return false; }
      } else {
        // discovered / no-access devices are shown next to any matching router that sees them
        if (!(this.adj.get(n.k) || []).some(k => inGroups(this.nodes.get(k)))) { return false; }
      }
    }
    const kind = n.lk ? 'locked' : (n.m ? 'managed' : 'discovered');
    if (Object.values(f.kinds).some(v => v) && !f.kinds[kind]) { return false; }
    if (Object.values(f.types).some(v => v) && !f.types[n.t || 'unknown']) { return false; }
    const needsStatus = Object.values(f.states).some(v => v) || f.eventsOnly || f.updatesOnly
      || f.cpuAbove !== null || f.memAbove !== null || !!f.version;
    if (!needsStatus) { return true; }
    if (!n.m || n.id === undefined) { return false; }
    const s = this.status.get(n.id);
    const st = s?.state || 'unknown';
    if (Object.values(f.states).some(v => v) && !f.states[st]) { return false; }
    if (f.eventsOnly && !(s && s.ev > 0)) { return false; }
    if (f.updatesOnly && !(s && s.upd > 0)) { return false; }
    if (f.cpuAbove !== null && !(s && s.cpu !== null && s.cpu >= f.cpuAbove)) { return false; }
    if (f.memAbove !== null && !(s && s.mem !== null && s.mem >= f.memAbove)) { return false; }
    if (f.version && !((s?.fw || '').toLowerCase().startsWith(f.version.toLowerCase()))) { return false; }
    return true;
  }

  /** Cluster that a node is folded into for the given grouping, or null when drawn on its own. */
  clusterOf(n: GraphNode, mode: GroupMode, expanded: Set<string>): string | null {
    if (mode === 'none') { return null; }
    if (mode === 'subnet') {
      const id = this.groupKey(n, mode)!;
      return expanded.has(id) ? null : id;
    }
    if (mode === 'area') {
      if (this.groupKey(n, mode)) {
        const head = n.ar === undefined || n.ar === '' ? 'standalone' : n.ar;
        const id = 'c:area:' + head;
        if (!expanded.has(id)) { return id; }
      }
    }
    // router mode (and inside an expanded area): leaf CPEs fold into their router
    if (n.lf && n.p) {
      const id = 'c:cpe:' + n.p;
      if (!expanded.has(id)) { return id; }
    }
    return null;
  }

  clusterName(id: string): string {
    if (id === 'c:net:none') { return 'No IP address'; }
    if (id.startsWith('c:net:')) { return id.slice(6) + '.0/24'; }
    if (id === 'c:area:standalone') { return 'Not connected'; }
    if (id.startsWith('c:area:')) {
      const head = this.nodes.get(id.slice(7));
      const core = head?.p ? this.nodes.get(head.p) : undefined;
      const link = head && core ? this.links.find(l => (l.a === head.k && l.b === core.k) || (l.b === head.k && l.a === core.k)) : undefined;
      let port = '';
      if (link && link.ps.length && core) {
        port = (link.a === core.k ? link.ps[0][0] : link.ps[0][1]) || '';
      }
      return (head?.n || id.slice(7)) + (port ? ' (via ' + port + ')' : '');
    }
    if (id.startsWith('c:cpe:')) { return 'CPEs of ' + (this.nodes.get(id.slice(6))?.n || ''); }
    return id;
  }

  private centers = new Map<string, number[]>();

  /** Position on screen: real position moved with its group (grouped views). */
  dpos(k: string): number[] {
    const p = this.pos(k);
    const o = this.offsets.get(k);
    return o ? [p[0] + o[0], p[1] + o[1]] : p;
  }

  private centroid(keys: string[]): number[] {
    let x = 0, y = 0;
    for (const k of keys) { const p = this.pos(k); x += p[0]; y += p[1]; }
    return [x / Math.max(1, keys.length), y / Math.max(1, keys.length)];
  }

  /** Group of a node for arranging (ignores what is open). */
  private groupKey(n: GraphNode, mode: GroupMode): string | null {
    if (mode === 'area') {
      if (n.dp === 0 && this.cores.indexOf(n.k) >= 0) { return null; }
      if (n.lf && n.p && this.nodes.get(n.p)?.dp === 0) { return null; }   // CPEs of the core
      return 'c:area:' + (n.ar ? n.ar : 'standalone');
    }
    if (mode === 'subnet') {
      const m = /^(\d+\.\d+\.\d+)\.\d+$/.exec(n.ip || '');
      return 'c:net:' + (m ? m[1] : 'none');
    }
    return null;
  }

  /**
   * Grouped views: closed groups become small discs packed round the core (areas) or in
   * rows (subnets); an opened group shows its devices at their own layout, moved as a
   * block to where the group sits, so nothing jumps far away and nothing overlaps.
   */
  private arrange(mode: GroupMode, expanded: Set<string>): void {
    this.offsets.clear();
    this.centers.clear();
    if (mode !== 'area' && mode !== 'subnet') { return; }
    const groups = new Map<string, string[]>();
    for (const n of this.nodes.values()) {
      const g = this.groupKey(n, mode);
      if (!g) { continue; }
      if (!groups.has(g)) { groups.set(g, []); }
      groups.get(g)!.push(n.k);
    }
    const info: { id: string; anchor: number[]; r: number; open: boolean }[] = [];
    for (const [id, keys] of groups) {
      const head = id.startsWith('c:area:') ? this.nodes.get(id.slice(7)) : undefined;
      const anchor = head ? this.pos(head.k) : this.centroid(keys);
      const open = expanded.has(id);
      let r = 64;
      if (open) {
        for (const k of keys) {
          const p = this.pos(k);
          r = Math.max(r, Math.hypot(p[0] - anchor[0], p[1] - anchor[1]) + 50);
        }
      }
      info.push({ id, anchor, r, open });
    }
    const gap = 40;
    if (mode === 'area') {
      const core = this.cores.length ? this.pos(this.cores[0]) : [0, 0];
      let coreR = 120;
      for (const n of this.nodes.values()) {
        if (!this.groupKey(n, mode)) {
          const p = this.pos(n.k);
          coreR = Math.max(coreR, Math.hypot(p[0] - core[0], p[1] - core[1]) + 70);
        }
      }
      const ring = info.filter(g => g.id !== 'c:area:standalone');
      const ang = (g: { anchor: number[] }) => Math.atan2(g.anchor[1] - core[1], g.anchor[0] - core[0]);
      if (this.layoutMode === 'tree') {
        // rows under the core, at most ~7 groups wide, left to right in tree order
        ring.sort((a, b) => a.anchor[0] - b.anchor[0]);
        const perRow = Math.max(4, Math.ceil(Math.sqrt(ring.length * 3)));
        let y = core[1] + coreR + 80;
        for (let i = 0; i < ring.length; i += perRow) {
          const row = ring.slice(i, i + perRow);
          const total = row.reduce((s, g) => s + 2 * g.r + gap, 0);
          const rowH = Math.max(...row.map(g => g.r));
          let x = core[0] - total / 2;
          for (const g of row) {
            this.centers.set(g.id, [x + g.r, y + rowH]);
            x += 2 * g.r + gap;
          }
          y += 2 * rowH + gap + 60;
        }
      } else {
        ring.sort((a, b) => ang(a) - ang(b));
        const circ = ring.reduce((s, g) => s + 2 * g.r + gap, 0);
        const R = Math.max(coreR + 60, circ / (2 * Math.PI));
        let a = ring.length ? ang(ring[0]) - (2 * ring[0].r + gap) / R / 2 : 0;
        for (const g of ring) {
          const span = (2 * g.r + gap) / R;
          const mid = a + span / 2;
          const d = Math.max(R, coreR + g.r + 30);
          this.centers.set(g.id, [core[0] + d * Math.cos(mid), core[1] + d * Math.sin(mid)]);
          a += span;
        }
      }
      const alone = info.find(g => g.id === 'c:area:standalone');
      if (alone) {
        let maxY = core[1] + coreR;
        for (const g of ring) { maxY = Math.max(maxY, this.centers.get(g.id)![1] + g.r); }
        this.centers.set(alone.id, [core[0], maxY + gap + alone.r]);
      }
    } else {
      info.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
      const width = Math.max(800, Math.sqrt(info.reduce((s, g) => s + (2 * g.r + gap) ** 2, 0)) * 1.4);
      let x = 0, y = 0, rowH = 0;
      for (const g of info) {
        const w = 2 * g.r + gap;
        if (x > 0 && x + w > width) { x = 0; y += rowH; rowH = 0; }
        this.centers.set(g.id, [x + g.r, y + g.r]);
        x += w;
        rowH = Math.max(rowH, w);
      }
    }
    for (const g of info) {
      if (!g.open) { continue; }
      const c = this.centers.get(g.id)!;
      const off = [c[0] - g.anchor[0], c[1] - g.anchor[1]];
      for (const k of groups.get(g.id)!) { this.offsets.set(k, off); }
    }
  }

  /** Where a node is drawn: its own key, its router's key (folded CPE) or a cluster id. */
  private ownerOf(n: GraphNode, mode: GroupMode, expanded: Set<string>): string {
    const c = this.clusterOf(n, mode, expanded);
    if (!c) { return n.k; }
    if (c.startsWith('c:cpe:')) {
      const r = this.nodes.get(c.slice(6));
      if (!r) { return n.k; }
      const rc = this.clusterOf(r, mode, expanded);
      return rc && !rc.startsWith('c:cpe:') ? rc : r.k;
    }
    return c;
  }

  /** What to draw: nodes (some folded into clusters or into their router) and merged edges. */
  display(mode: GroupMode, expanded: Set<string>, f: Filters, fmode: FilterMode): { nodes: DisplayNode[]; edges: DisplayEdge[]; shown: number } {
    this.arrange(mode, expanded);
    const owner = new Map<string, string>();
    const ok = new Map<string, boolean>();
    for (const n of this.nodes.values()) {
      const m = this.matches(n, f);
      if (!m && fmode === 'hide') { continue; }
      ok.set(n.k, m);
      owner.set(n.k, this.ownerOf(n, mode, expanded));
    }
    // a CPE whose router is not drawn (filtered out) is drawn on its own
    for (const [k, o] of owner) {
      if (o !== k && !o.startsWith('c:') && owner.get(o) !== o) { owner.set(k, k); }
    }
    const items = new Map<string, DisplayNode>();
    let shown = 0;
    for (const [k, o] of owner) {
      const n = this.nodes.get(k)!;
      const st = this.stateOf(n);
      const ev = n.id !== undefined ? (this.status.get(n.id)?.ev || 0) : 0;
      const isOk = ok.get(k)!;
      if (isOk) { shown++; }
      let d = items.get(o);
      if (!d) {
        const cluster = o.startsWith('c:');
        d = { id: o, cluster, label: '', members: [], x: 0, y: 0, state: null, dim: true,
              events: 0, down: 0, warn: 0, total: 0, folded: 0 };
        items.set(o, d);
      }
      if (o === k) {
        const p = this.dpos(k);
        d.node = n;
        d.label = n.n;
        d.x = p[0];
        d.y = p[1];
        d.state = st;
        d.events = ev;
        d.total = 1;
        if (isOk) { d.dim = false; }
        continue;
      }
      if (!d.cluster) {            // CPE folded into its router
        d.folded++;
        d.members!.push(k);
        if (isOk) { d.dim = false; }
        continue;
      }
      d.members!.push(k);
      d.total++;
      d.events += ev;
      if (st === 'down') { d.down++; }
      if (st === 'warn' || st === 'degraded') { d.warn++; }
      if (st && (d.state === null || STATE_RANK[st] > STATE_RANK[d.state])) { d.state = st; }
      if (isOk) { d.dim = false; }
    }
    const out: DisplayNode[] = [];
    for (const d of items.values()) {
      if (d.cluster) {
        const c = this.centers.get(d.id) || this.centroid(d.members!);
        d.x = Math.round(c[0]);
        d.y = Math.round(c[1]);
        d.label = this.clusterName(d.id);
      }
      out.push(d);
    }
    // merge links between the same two drawn things
    const edges = new Map<string, DisplayEdge>();
    for (const l of this.links) {
      const a = owner.get(l.a), b = owner.get(l.b);
      if (!a || !b || a === b) { continue; }
      const [x, y] = a < b ? [a, b] : [b, a];
      const id = x + '|' + y;
      let e = edges.get(id);
      if (!e) {
        e = { id, from: x, to: y, count: 0, links: [], dim: !!(items.get(x)?.dim || items.get(y)?.dim) };
        edges.set(id, e);
      }
      e.count++;
      e.links.push(l);
    }
    return { nodes: out, edges: [...edges.values()], shown };
  }

  search(q: string, limit = 20): GraphNode[] {
    const s = q.trim().toLowerCase();
    if (!s) { return []; }
    const scored: [number, GraphNode][] = [];
    for (const it of this.searchIdx) {
      const i = it.s.indexOf(s);
      if (i < 0) { continue; }
      const n = this.nodes.get(it.k)!;
      const name = n.n.toLowerCase();
      let score = 3;
      if (name === s || n.ip === s) { score = 0; } else if (name.startsWith(s) || (n.ip || '').startsWith(s)) { score = 1; } else if (i < name.length) { score = 2; }
      if (!n.m) { score += 0.5; }
      scored.push([score, n]);
    }
    scored.sort((a, b) => a[0] - b[0] || a[1].n.localeCompare(b[1].n));
    return scored.slice(0, limit).map(x => x[1]);
  }

  /** Clusters that must open so that these node keys are drawn on their own. */
  expandFor(keys: string[], mode: GroupMode, expanded: Set<string>): void {
    for (const k of keys) {
      let n = this.nodes.get(k);
      for (let guard = 0; n && guard < 3; guard++) {
        const c = this.clusterOf(n, mode, expanded);
        if (!c) { break; }
        expanded.add(c);
      }
    }
  }

  /** Shortest path by hop count (breadth-first). */
  path(from: string, to: string): string[] {
    if (from === to) { return [from]; }
    const prev = new Map<string, string>([[from, '']]);
    const q: string[] = [from];
    for (let i = 0; i < q.length; i++) {
      const u = q[i];
      for (const v of this.adj.get(u) || []) {
        if (prev.has(v)) { continue; }
        prev.set(v, u);
        if (v === to) {
          const out = [to];
          let c = u;
          while (c) { out.push(c); c = prev.get(c)!; }
          return out.reverse();
        }
        q.push(v);
      }
    }
    return [];
  }

  linkBetween(a: string, b: string): GraphLink | undefined {
    return this.links.find(l => (l.a === a && l.b === b) || (l.a === b && l.b === a));
  }

  /** Port names of a link as seen from `side`, e.g. "ether2 (bridge1) - sfp1". */
  ports(l: GraphLink, side: string): string {
    return l.ps.map(p => {
      const mine = l.a === side ? p[0] : p[1];
      const other = l.a === side ? p[1] : p[0];
      const br = p[2] ? ' (' + p[2] + ')' : '';
      return (mine || '?') + (l.a === side ? br : '') + ' ↔ ' + (other || '?') + (l.a === side ? '' : br);
    }).join(', ');
  }

  counts(): { [s: string]: number } {
    const c: { [s: string]: number } = { up: 0, down: 0, degraded: 0, warn: 0, maint: 0, unknown: 0, managed: 0, discovered: 0, locked: 0 };
    for (const n of this.nodes.values()) {
      if (n.lk) { c['locked']++; continue; }
      if (!n.m) { c['discovered']++; continue; }
      c['managed']++;
      c[this.stateOf(n) || 'unknown']++;
    }
    return c;
  }

  problems(): { node: GraphNode; s: DevStatus }[] {
    const out: { node: GraphNode; s: DevStatus }[] = [];
    for (const n of this.nodes.values()) {
      if (!n.m || n.id === undefined) { continue; }
      const s = this.status.get(n.id);
      if (s && s.state !== 'up' && s.state !== 'unknown') { out.push({ node: n, s }); }
    }
    out.sort((a, b) => STATE_RANK[b.s.state] - STATE_RANK[a.s.state] || (a.s.since || 9e12) - (b.s.since || 9e12) || a.node.n.localeCompare(b.node.n));
    return out;
  }
}

/**
 * Problems arranged for a large network (hundreds of alerts).
 *  - 'cause': a down device whose upstream path (towards the core) has another down
 *    device is folded under the top-most one, so one broken uplink is one row.
 *  - 'area': one section per area (branch leaving the core), worst first.
 *  - 'none': flat list.
 */
export function problemSections(map: NetMap, all: { node: GraphNode; s: DevStatus }[], q: ProblemQuery): ProblemSection[] {
  const text = (q.text || '').trim().toLowerCase();
  const stateOn = Object.keys(q.states).filter(k => q.states[k]);
  const keep = (x: { node: GraphNode; s: DevStatus }) =>
    (!stateOn.length || stateOn.indexOf(x.s.state) >= 0) &&
    (!text || (x.node.n + ' ' + (x.node.ip || '') + ' ' + (x.node.md || '') + ' ' + (x.s.worst || '')).toLowerCase().indexOf(text) >= 0);

  // root cause: top-most down ancestor that is itself a problem
  const downKeys = new Set(all.filter(x => x.s.state === 'down').map(x => x.node.k));
  const rootOf = (n: GraphNode): string | null => {
    let top: string | null = null;
    let k = n.p, guard = 0;
    while (k && guard++ < 64) {
      if (downKeys.has(k)) { top = k; }
      k = map.nodes.get(k)?.p;
    }
    return top;
  };

  const rows: ProblemRow[] = [];
  if (q.groupBy === 'cause') {
    const byKey = new Map<string, ProblemRow>();
    const behind: { x: { node: GraphNode; s: DevStatus }; root: string }[] = [];
    for (const x of all) {
      const r = x.s.state === 'down' ? rootOf(x.node) : null;
      if (r) { behind.push({ x, root: r }); continue; }
      const row: ProblemRow = { node: x.node, s: x.s, behind: [] };
      byKey.set(x.node.k, row);
    }
    for (const b of behind) { byKey.get(b.root)?.behind.push(b.x); }
    for (const row of byKey.values()) {
      // a root row is kept if it or anything behind it matches
      const sub = row.behind.filter(keep);
      if (keep(row) || sub.length) { rows.push({ ...row, behind: keep(row) ? row.behind : sub }); }
    }
  } else {
    for (const x of all) { if (keep(x)) { rows.push({ node: x.node, s: x.s, behind: [] }); } }
  }

  const weight = (r: ProblemRow) => r.behind.length;
  const cmp: { [k: string]: (a: ProblemRow, b: ProblemRow) => number } = {
    severity: (a, b) => STATE_RANK[b.s.state] - STATE_RANK[a.s.state] || weight(b) - weight(a) ||
      (a.s.since || 9e12) - (b.s.since || 9e12) || a.node.n.localeCompare(b.node.n),
    longest: (a, b) => (a.s.since || 9e12) - (b.s.since || 9e12) || STATE_RANK[b.s.state] - STATE_RANK[a.s.state],
    newest: (a, b) => (b.s.since || 0) - (a.s.since || 0) || STATE_RANK[b.s.state] - STATE_RANK[a.s.state],
    name: (a, b) => a.node.n.localeCompare(b.node.n),
  };
  rows.sort(cmp[q.sort] || cmp['severity']);

  const tally = (sec: ProblemSection, r: ProblemRow) => {
    sec.total += 1 + r.behind.length;
    sec.down += (r.s.state === 'down' ? 1 : 0) + r.behind.length;
    sec.warn += (r.s.state === 'warn' || r.s.state === 'degraded') ? 1 : 0;
  };

  if (q.groupBy !== 'area') {
    const sec: ProblemSection = { key: 'all', title: '', rows, total: 0, down: 0, warn: 0 };
    rows.forEach(r => tally(sec, r));
    return rows.length ? [sec] : [];
  }
  const secs = new Map<string, ProblemSection>();
  for (const r of rows) {
    const ak = r.node.ar && map.nodes.has(r.node.ar) ? r.node.ar : '';
    let sec = secs.get(ak);
    if (!sec) {
      const head = ak ? map.nodes.get(ak) : undefined;
      sec = { key: ak || 'core', title: head ? head.n : 'Core', head, rows: [], total: 0, down: 0, warn: 0 };
      secs.set(ak, sec);
    }
    sec.rows.push(r);
    tally(sec, r);
  }
  return [...secs.values()].sort((a, b) => b.down - a.down || b.total - a.total || a.title.localeCompare(b.title));
}

// ---------------------------------------------------------------------------
// formatting

export function fmtBps(v: number | null | undefined): string {
  if (v === null || v === undefined || isNaN(v)) { return '-'; }
  const u = ['b/s', 'kb/s', 'Mb/s', 'Gb/s', 'Tb/s'];
  let i = 0;
  let x = v;
  while (x >= 1000 && i < u.length - 1) { x /= 1000; i++; }
  return (x >= 100 || i === 0 ? Math.round(x) : x.toFixed(1)) + ' ' + u[i];
}

export function fmtDuration(sec: number | null | undefined): string {
  if (sec === null || sec === undefined || sec < 0) { return '-'; }
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
  if (d) { return d + 'd ' + h + 'h'; }
  if (h) { return h + 'h ' + m + 'm'; }
  if (m) { return m + 'm'; }
  return Math.floor(sec) + 's';
}

export function fmtAgo(epoch: number | null | undefined, now = Date.now() / 1000): string {
  if (!epoch) { return '-'; }
  return fmtDuration(Math.max(0, now - epoch)) + ' ago';
}
