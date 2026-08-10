import { Component, OnDestroy, OnInit, ViewEncapsulation, ViewChild, ElementRef } from "@angular/core";
import { Router, ActivatedRoute } from "@angular/router";
import { dataProvider } from "../../providers/mikrowizard/data";
import { loginChecker } from "../../providers/login_checker";
import { Table } from 'primeng/table';
import { __setFunctionName } from "tslib";
interface IUser {
  name: string;
  state: string;
  registered: string;
  country: string;
  usage: number;
  period: string;
  payment: string;
  activity: string;
  avatar: string;
  status: string;
  color: string;
}

type radiodata = {
  [key: string]: any;
};

@Component({
  templateUrl: "device.component.html",
  styleUrls: ["device.component.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class DeviceComponent implements OnInit, OnDestroy {
  public uid!: number;
  public sessionloaded: boolean = false;
  public uname!: string;
  public tz!: string;
  public ispro: boolean = false;
  public small_screen = false;
  public show_dev_logs: boolean = false;
  public show_auth_logs: boolean = false;
  public show_acc_logs: boolean = false;
  public actice_tab_index: number = 0;
  public reloading: boolean = false;
  constructor(
    private data_provider: dataProvider,
    private route: ActivatedRoute,
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
      _self.tz = res.tz;
      _self.ispro = res.ISPRO;
      _self.sessionloaded = true;
      const userId = _self.uid;
      if (res.role != "admin") {
        setTimeout(function () {
          _self.router.navigate(["/user/dashboard"]);
        }, 100);
      }
    });
    //get datagrid data
    function isNotEmpty(value: any): boolean {
      return value !== undefined && value !== null && value !== "";
    }
  }
  public devdata: any;
  public devsensors: any;
  public radiodata!: radiodata;
  public radio_devsensors!: any;

  @ViewChild('dtInterfaces') dtInterfaces!: Table;

  public loading: boolean = true;
  public radio_loading: boolean = true;
  public InterfaceChartModalVisible: boolean = false;
  public rows: any = [];
  public Selectedrows: any;
  public devid: number = 0;
  public data_interval: any;
  public delta: string = "live";
  public total_type: string = "bps";
  public interface_rate: any = {};
  public options: any;
  public is_radio: boolean = false;
  public dhcp_server_available: boolean = false;
  public isMikroTik: boolean = false;
  public dhcp_server_data: any = {};

  public deviceExecutions: any[] = [];
  public execsLoading: boolean = false;

  public interfaces: Array<any> = [];

  public interfacesExportModalVisible: boolean = false;
  public executionsExportModalVisible: boolean = false;

  public interfaceExportColumns = [
    { field: 'name', label: 'Name', selected: true },
    { field: 'type', label: 'Type', selected: true },
    { field: 'mac-address', label: 'MAC Address', selected: true },
    { field: 'running', label: 'Running', selected: true },
    { field: 'disabled', label: 'Disabled', selected: true },
    { field: 'comment', label: 'Comment', selected: true },
    { field: 'rx-byte', label: 'RX Bytes', selected: false },
    { field: 'tx-byte', label: 'TX Bytes', selected: false },
    { field: 'rx-packet', label: 'RX Packets', selected: false },
    { field: 'tx-packet', label: 'TX Packets', selected: false },
    { field: 'rx-error', label: 'RX Errors', selected: false },
    { field: 'tx-error', label: 'TX Errors', selected: false }
  ];

  public executionExportColumns = [
    { field: 'id', label: 'ID', selected: true },
    { field: 'command', label: 'Command', selected: true },
    { field: 'status', label: 'Status', selected: true },
    { field: 'executed_at', label: 'Executed At', selected: true },
    { field: 'user', label: 'User', selected: true },
    { field: 'output', label: 'Output', selected: false }
  ];

  openInterfacesExportModal() {
    this.interfacesExportModalVisible = true;
  }

  openExecutionsExportModal() {
    this.executionsExportModalVisible = true;
  }

  // AI Chat Helper State
  @ViewChild('chatScrollContainer') private chatScrollContainer!: ElementRef;
  public chatHistory: any[] = [];
  public chatLoading: boolean = false;
  public userPrompt: string = '';

  // Floating Chat State
  public chatVisible: boolean = false;
  public showSessionsList: boolean = false;
  public isDarkTheme: boolean = false;
  public isMaximized: boolean = false;
  public chatSessions: any[] = [];
  public loadingSessions: boolean = false;
  public activeSessionId: number | null = null;
  public renameSessionId: number | null = null;
  public renameTitle: string = '';



  applyFilterGlobal($event: any, stringVal: string) {
    this.dtInterfaces.filterGlobal(($event.target as HTMLInputElement).value, stringVal);
  }
  reload_dhcp_server() {
    this.get_DHCP_data();
  }
  speedChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: { color: '#333' }
      },
      tooltip: { enabled: true }
    },
    scales: {
      x: {
        ticks: { color: '#333' },
        grid: { color: 'rgba(0, 0, 0, 0.05)' }
      },
      y: {
        ticks: { color: '#333' },
        grid: { color: 'rgba(0, 0, 0, 0.05)' }
      }
    }
  };

  Chartoptions = {
    responsive: true,
    _self: this,
    plugins: {
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const units = ["bit", "Kib", "Mib", "Gib", "Tib"];
            let label = context.dataset.label || "";
            var res = context.parsed.y;
            let unitIndex = 0;
            // if (res>8) res /=8;
            while (res >= 1024 && unitIndex < units.length - 1) {
              res /= 1024;
              unitIndex++;
            }
            switch (context.dataset.unit) {
              case "rx":
                return "rx/s :" + res.toFixed(3) + " " + units[unitIndex];
                break;
              case "tx":
                return "tx/s :" + res.toFixed(3) + " " + units[unitIndex];
                break;
              case "rxp":
                return "rxp/s :" + context.parsed.y;
                break;
              case "txp":
                return "txp/s :" + context.parsed.y;
                break;
              default:
                return context.parsed.y;
                break;
            }
          },
        },
      },
      legend: {
        display: true,
      },
    },
    maintainAspectRatio: true,
    scales: {
      x: {

        title: {
          display: true,
          text: 'Time',
          color: '#333',
        },
        ticks: {
          autoSkip: true,
          maxTicksLimit: 30,
          color: '#333',
        }
      },
      yA: {
        display: true,
        stacked: true,
        position: "left",
        type: "linear",
        color: "#17522f",
        grid: {
          color: "rgba(23, 82, 47, 0.3)",
          borderDash: [5, 5],
        },
        ticks: {
          color: "#17522f",
          callback: (value: any) => {
            if (this.total_type == "pps")
              return value + " pps";
            const units = ["bit", "Kib", "Mib", "Gib", "Tib"];
            var res = value;
            let unitIndex = 0;
            while (res >= 1024 && unitIndex < units.length - 1) {
              res /= 1024;
              unitIndex++;
            }
            return res.toFixed(3) + " " + units[unitIndex];
          },
        },
        scaleLabel: {
          display: true,
        },
      },
      yB: {
        display: true,
        stacked: true,
        position: "right",
        type: "linear",
        grid: {
          color: "rgba(23, 25, 81, 0.3)",
          borderDash: [8, 8],
        },
        border: {
          width: 2,
        },
        ticks: {
          color: "#171951",
          callback: (value: any) => {
            if (this.total_type == "pps")
              return value + " pps";
            const units = ["bit", "Kib", "Mib", "Gib", "Tib"];
            var res = value;
            let unitIndex = 0;
            while (res >= 1024 && unitIndex < units.length - 1) {
              res /= 1024;
              unitIndex++;
            }
            return res.toFixed(3) + " " + units[unitIndex];
          },
        },
      },
    },
    elements: {
      line: {
        borderWidth: 1,
        tension: 0.1,
      },
      point: {
        radius: 4,
        hitRadius: 10,
        hoverRadius: 6,
      },
    },
  };

  ngOnInit(): void {
    const savedTheme = localStorage.getItem('chat_theme');
    this.isDarkTheme = savedTheme === 'dark';

    if (window.innerWidth <= 1200) {
      this.small_screen = true;
    }
    window.onresize = () => (this.small_screen = window.innerWidth <= 1200);
    this.devid = Number(this.route.snapshot.paramMap.get("id"));
    const tabParam = this.route.snapshot.paramMap.get("tab");
    if (tabParam) { this.actice_tab_index = Number(tabParam); }
    this.options = this.Chartoptions;
    // wait untill sessionloaded is set
    let interval = setInterval(() => {
      if (this.sessionloaded) {
        clearInterval(interval);
        this.initDeviceInfo();
      }
    }, 100);
  }

  optionsDefault = {
    plugins: {
      legend: {
        display: false,
      },
    },
    maintainAspectRatio: true,
    scales: {
      x: {
        grid: {
          display: false,
          drawBorder: false,
        },
        ticks: {
          display: false,
        },
      },
      y: {
        display: false,
        grid: {
          display: false,
        },
        ticks: {
          display: false,
        },
      },
    },
    elements: {
      line: {
        borderWidth: 1,
        tension: 0.4,
      },
      point: {
        radius: 4,
        hitRadius: 10,
        hoverRadius: 6,
      },
    },
  };
  setOptions() {
    for (let idx = 0; idx < 5; idx++) {
      const options = JSON.parse(JSON.stringify(this.optionsDefault));
      switch (idx) {
        case 0: {
          this.options.push(options);
          break;
        }
        case 1: {
          options.scales.y.min = -9;
          options.scales.y.max = 39;
          this.options.push(options);
          break;
        }
        case 2: {
          options.scales.x = { display: false };
          options.scales.y = { display: false };
          options.elements.line.borderWidth = 2;
          options.elements.point.radius = 2;
          this.options.push(options);
          break;
        }
        case 3: {
          options.scales.x.grid = { display: false, drawTicks: false };
          options.scales.x.grid = {
            display: false,
            drawTicks: false,
            drawBorder: false,
          };
          options.scales.y.min = undefined;
          options.scales.y.max = undefined;
          options.elements = {};
          this.options.push(options);
          break;
        }
        case 4: {
          options.plugins = {
            tooltip: {
              callbacks: {
                label: function (context: any) {
                  const units = ["bit", "Kib", "Mib", "Gib", "Tib"];
                  let label = context.dataset.label || "";
                  var res = context.parsed.y;
                  let unitIndex = 0;
                  // if (res>8) res /=8;
                  while (res >= 1024 && unitIndex < units.length - 1) {
                    res /= 1024;
                    unitIndex++;
                  }
                  switch (context.dataset.unit) {
                    case "rx":
                      return "rx/s :" + res.toFixed(3) + " " + units[unitIndex];
                      break;
                    case "tx":
                      return "tx/s :" + res.toFixed(3) + " " + units[unitIndex];
                      break;
                    case "rxp":
                      return "rxp/s :" + context.parsed.y;
                      break;
                    case "txp":
                      return "txp/s :" + context.parsed.y;
                      break;
                    default:
                      return context.parsed.y;
                      break;
                  }
                },
              },
            },
            legend: {
              display: false,
            },
          };
          options.scales = {
            x: { display: false },
            yA: {
              display: false,
              stacked: true,
              position: "left",
              type: "linear",
              scaleLabel: {
                display: true,
              },
            },
            yB: {
              display: false,
              stacked: true,
              position: "right",
              type: "linear",
            },
          };
          options.elements.line.borderWidth = 2;
          options.elements.point.radius = 2;
          this.options.push(options);
          break;
        }
      }
    }
  }

  logger(item: any) {
    console.dir(item);
  }
  switch_total() {
    this.total_type = this.total_type == "bps" ? "pps" : "bps";
    this.updateData();
  }
  updateData(): void {
    var _self = this;
    this.data_provider.get_dev_info(this.devid).then((res) => {
      _self.devdata = res;
      _self.interfaces = res.interfaces;
      if ("is_radio" in res) _self.is_radio = res.is_radio;
      _self.isMikroTik = !res.device_type || res.device_type === 'mikrotik';

      if (_self.isMikroTik) {
        _self.data_provider
          .get_dev_sensors(_self.devid, _self.delta, _self.total_type)
          .then((res) => {
            _self.devsensors = res;
            _self.loading = false;
          });
        if (_self.is_radio) _self.get_radio_data();
        _self.get_DHCP_data();
      } else {
        _self.loading = false;
      }
    });
  }
  checkitem(item: any) {
    if (item.value && !item.key.match("sensors|id|_availble|interfaces")) {
      return true;
    } else {
      return false;
    }
  }
  convert_bw_human(mynumber: number = 0, unit: string) {
    const units = ["bit", "Kib", "Mib", "Gib", "Tib"];
    let unitIndex = 0;
    while (mynumber >= 1024 && unitIndex < units.length - 1) {
      mynumber /= 1024;
      unitIndex++;
    }
    switch (unit) {
      case "rx":
        return mynumber.toFixed(3) + " " + units[unitIndex];
        break;
      case "tx":
        return mynumber.toFixed(3) + " " + units[unitIndex];
        break;
      default:
        return mynumber;
        break;
    }
  }

  show_interface_rate(name: string) {
    var _self = this;
    _self.InterfaceChartModalVisible = false;
    this.data_provider
      .get_dev_ifstat(_self.devid, _self.delta, name, _self.total_type)
      .then((res) => {
        _self.interface_rate = res["data"];
        _self.InterfaceChartModalVisible = true;
      });
  }

  get_radio_data() {
    if (!this.ispro)
      return;
    var _self = this;
    _self.data_provider
      .get_dev_radio_sensors(_self.devid, _self.delta)
      .then((res) => {
        _self.radio_devsensors = res;
        _self.radio_loading = false;
      });
  }

  get_DHCP_data() {
    if (!this.ispro)
      return;
    var _self = this;
    if (_self.reloading)
      return;
    _self.reloading = true;
    _self.data_provider
      .get_dev_dhcp_info(_self.devid)
      .then((res) => {
        _self.dhcp_server_available = Boolean(res.length);
        _self.dhcp_server_data = res;
        // loop in dhcp_server_data and create a new object with the data for chart for each dhcp server
        _self.reloading = false;
        _self.dhcp_server_data.forEach((element: any) => {
          if (element.pools.length > 0) {
            var pooldata = element.pools[0];
            element.chartpools = {
              labels: ['Used', 'Free'],
              datasets: [{
                backgroundColor: ['#E46651', '#41B883'],
                data: [pooldata.used_ips, pooldata.available_ips]
              }]
            };
          }
        });
      });
  }
  reload_device(): void {
    this.initDeviceInfo();
  }
  initDeviceInfo(): void {
    var _self = this;
    if (this.reloading) return;
    clearInterval(this.data_interval);
    this.updateData();
    this.data_interval = setInterval(() => {
      this.reloading = true;
      this.data_provider.get_dev_info(this.devid).then((res) => {
        _self.devdata = res;
        if ("is_radio" in res) _self.is_radio = res.is_radio;
        _self.interfaces = res.interfaces;
        _self.isMikroTik = !res.device_type || res.device_type === 'mikrotik';

        if (_self.isMikroTik) {
          _self.data_provider
            .get_dev_sensors(_self.devid, _self.delta, _self.total_type)
            .then((res) => {
              _self.devsensors = res;
              _self.loading = false;
              _self.reloading = false;

              if (_self.is_radio) _self.get_radio_data();
              _self.get_DHCP_data();
            });
        } else {
          _self.loading = false;
          _self.reloading = false;
        }
      });
    }, 30000);
  }
  show_history(itme: any) {
    return
  }
  objectlen(object: any) {
    return object ? Object.keys(object).length : 0;
  }
  strangth_at_rate_extract(data: string) {
    return data ? data.split(',') : [];
  }

  toggleTheme() {
    this.isDarkTheme = !this.isDarkTheme;
    localStorage.setItem('chat_theme', this.isDarkTheme ? 'dark' : 'light');
  }

  toggleMaximize() {
    this.isMaximized = !this.isMaximized;
  }

  toggleChat() {
    this.chatVisible = !this.chatVisible;
    if (this.chatVisible && this.chatSessions.length === 0) {
      this.loadChatSessions();
    }
  }

  toggleSessionsList() {
    this.showSessionsList = !this.showSessionsList;
    if (this.showSessionsList) {
      this.loadChatSessions();
    }
  }

  loadAgentConfig() {
    this.data_provider.getDeviceAgentConfig(this.devid).then((res: any) => {
      const data = res.data || res.result?.data;
      if (data) {
        this.devdata['agent_modes'] = data.agent_modes;
      }
    });
  }


  loadChatSessions() {
    this.loadingSessions = true;
    this.data_provider.adminGetSelfChatSessions(this.devid).then((res: any) => {
      this.loadingSessions = false;
      const data = res.result || res;
      if (Array.isArray(data)) {
        this.chatSessions = data;
        if (this.chatSessions.length > 0) {
          const stillExists = this.activeSessionId && this.chatSessions.some(s => s.id === this.activeSessionId);
          if (!stillExists) {
            this.selectSession(this.chatSessions[0].id);
          }
        } else {
          this.createNewSession();
        }
      } else {
        this.chatSessions = [];
        this.createNewSession();
      }
    }).catch(err => {
      this.loadingSessions = false;
      this.chatSessions = [];
      console.error(err);
    });
  }

  loadChatSessionsListOnly() {
    this.data_provider.adminGetSelfChatSessions(this.devid).then((res: any) => {
      const data = res.result || res;
      if (Array.isArray(data)) {
        this.chatSessions = data;
      }
    }).catch(err => console.error(err));
  }

  createNewSession() {
    const title = "Admin Chat " + new Date().toLocaleString();
    this.data_provider.adminCreateSelfChatSession(this.devid, title).then((res: any) => {
      const data = res.result || res;
      if (data && data.id) {
        this.activeSessionId = data.id;
        this.loadChatSessions();
      }
    }).catch(err => console.error(err));
  }

  createNewSessionFromUI() {
    const title = "Admin Chat " + new Date().toLocaleString();
    this.data_provider.adminCreateSelfChatSession(this.devid, title).then((res: any) => {
      const data = res.result || res;
      if (data && data.id) {
        this.activeSessionId = data.id;
        this.showSessionsList = false;
        this.loadChatSessions();
      }
    }).catch(err => console.error(err));
  }

  selectSession(sid: number) {
    this.activeSessionId = sid;
    this.chatHistory = [];
    this.chatLoading = true;

    this.data_provider.adminGetSelfChatSession(sid).then((res: any) => {
      this.chatLoading = false;
      const data = res.result || res;
      if (data && data.history) {
        this.chatHistory = data.history;
        this.scrollToBottom();
      }
    }).catch(err => {
      this.chatLoading = false;
      console.error(err);
    });
  }

  selectSessionFromUI(sid: number) {
    this.selectSession(sid);
    this.showSessionsList = false;
  }

  startRenameSession(session: any, event: Event) {
    event.stopPropagation();
    this.renameSessionId = session.id;
    this.renameTitle = session.title;
  }

  saveRenameSession(sid: number) {
    if (!this.renameTitle.trim()) return;
    this.data_provider.adminRenameSelfChatSession(sid, this.renameTitle.trim()).then(() => {
      this.renameSessionId = null;
      this.loadChatSessionsListOnly();
    }).catch(err => console.error(err));
  }

  cancelRenameSession(event: Event) {
    event.stopPropagation();
    this.renameSessionId = null;
  }

  deleteSession(sid: number) {
    if (!confirm("Are you sure you want to delete this chat session?")) return;
    this.data_provider.adminDeleteSelfChatSession(sid).then(() => {
      if (this.activeSessionId === sid) {
        this.activeSessionId = null;
        this.chatHistory = [];
      }
      this.loadChatSessions();
    }).catch(err => console.error(err));
  }

  sendChatMessage(promptText?: string) {
    const text = (promptText || this.userPrompt || '').trim();
    if (!text || this.chatLoading || !this.activeSessionId) return;

    this.chatHistory.push({ role: 'user', content: text });
    if (!promptText) {
      this.userPrompt = '';
    }
    this.chatLoading = true;
    this.scrollToBottom();

    this.data_provider.adminSendSelfChatMessage(this.activeSessionId, text).then((res: any) => {
      this.chatLoading = false;
      const data = res.result || res;
      if (data && data.history) {
        this.chatHistory = data.history;
        this.scrollToBottom();
      } else if (data && data.reply) {
        this.chatHistory.push({ role: 'model', content: data.reply });
        this.scrollToBottom();
      } else {
        this.chatHistory.push({ role: 'model', content: 'Sorry, I encountered an error processing your request.' });
      }
    }).catch(e => {
      this.chatLoading = false;
      this.chatHistory.push({ role: 'model', content: 'Connection error. Please try again.' });
      console.error(e);
    });
  }

  scrollToBottom() {
    setTimeout(() => {
      if (this.chatScrollContainer) {
        this.chatScrollContainer.nativeElement.scrollTop = this.chatScrollContainer.nativeElement.scrollHeight;
      }
    }, 100);
  }

  clearChat() {
    if (this.activeSessionId) {
      this.deleteSession(this.activeSessionId);
    }
  }

  loadExecutions() {
    this.execsLoading = true;
    this.data_provider.get_executions({ device_id: this.devid }).then((res: any) => {
      this.deviceExecutions = res.data || [];
      this.execsLoading = false;
    }).catch(() => {
      this.execsLoading = false;
    });
  }

  ngOnDestroy() {
    clearInterval(this.data_interval);
  }
}
