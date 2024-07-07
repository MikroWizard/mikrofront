import { Component, OnInit } from "@angular/core";
import { Router, ActivatedRoute } from "@angular/router";
import { dataProvider } from "../../providers/mikrowizard/data";
import { loginChecker } from "../../providers/login_checker";
import {
  GuiInfoPanel,
  GuiColumn,
  GuiColumnMenu,
  GuiPaging,
  GuiPagingDisplay,
  GuiRowSelectionMode,
  GuiRowSelection,
  GuiRowSelectionType,
} from "@generic-ui/ngx-grid";
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

@Component({
  templateUrl: "device.component.html",
  styleUrls: ["device.component.scss"],
})
export class DeviceComponent implements OnInit {
  public uid: number;
  public uname: string;
  public tz: string;
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
  public columns: Array<GuiColumn> = [];
  public loading: boolean = true;
  public InterfaceChartModalVisible: boolean = false;
  public rows: any = [];
  public Selectedrows: any;
  public devid: number = 0;
  public data_interval: any;
  public delta: string = "5m";
  public total_type: string = "bps";
  public interface_rate: any = {};
  public options: any;
  public sorting = {
    enabled: true,
    multiSorting: true,
  };
  public interfaces: Array<any> = [];
  public paging: GuiPaging = {
    enabled: true,
    page: 1,
    pageSize: 10,
    pageSizes: [5, 10, 25, 50],
    display: GuiPagingDisplay.ADVANCED,
  };

  public columnMenu: GuiColumnMenu = {
    enabled: true,
    sort: true,
    columnsManager: true,
  };

  public infoPanel: GuiInfoPanel = {
    enabled: true,
    infoDialog: false,
    columnsManager: true,
    schemaManager: true,
  };

  public rowSelection: boolean | GuiRowSelection = {
    enabled: true,
    type: GuiRowSelectionType.CHECKBOX,
    mode: GuiRowSelectionMode.MULTIPLE,
  };

  Chartoptions = {
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
      x: { display: false },
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
          callback: function (value: any, index: any, ticks: any) {
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
          callback: function (value: any, index: any, ticks: any) {
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
        tension: 0.4,
      },
      point: {
        radius: 4,
        hitRadius: 10,
        hoverRadius: 6,
      },
    },
  };

  ngOnInit(): void {
    this.devid = Number(this.route.snapshot.paramMap.get("id"));
    this.options = this.Chartoptions;
    this.initDeviceInfo();
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
  updateData(): void {
    var _self = this;
    this.data_provider.get_dev_info(this.devid).then((res) => {
      _self.devdata = res;
      _self.interfaces = res.interfaces;
      _self.data_provider
        .get_dev_sensors(_self.devid, _self.delta, _self.total_type)
        .then((res) => {
          _self.devsensors = res;
          _self.loading = false;
        });
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

  initDeviceInfo(): void {
    var _self = this;
    clearInterval(this.data_interval);
    this.updateData();
    this.data_interval = setInterval(() => {
      this.data_provider.get_dev_info(this.devid).then((res) => {
        _self.devdata = res;

        _self.interfaces = res.interfaces;
        _self.data_provider
          .get_dev_sensors(_self.devid, _self.delta, _self.total_type)
          .then((res) => {
            _self.devsensors = res;
            _self.loading = false;
          });
      });
    }, 1000000);
  }
}
