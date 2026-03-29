import { Component, OnDestroy, OnInit, ViewEncapsulation, ViewChild } from "@angular/core";
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
  public small_screen=false;
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
  public dhcp_server_data: any = {};
  
  public interfaces: Array<any> = [];

  applyFilterGlobal($event: any, stringVal: string) {
    this.dtInterfaces.filterGlobal(($event.target as HTMLInputElement).value, stringVal);
  }
  reload_dhcp_server(){
    this.get_DHCP_data();
  }
  Chartoptions = {
    responsive: true,
    _self :this,
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
            if(this.total_type=="pps")
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
          callback: (value: any) =>{
            if(this.total_type=="pps")
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

    if (window.innerWidth <= 1200) {
      this.small_screen = true;
    }
    window.onresize = () => (this.small_screen = window.innerWidth <= 1200);
    this.devid = Number(this.route.snapshot.paramMap.get("id"));
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
      _self.data_provider
        .get_dev_sensors(_self.devid, _self.delta, _self.total_type)
        .then((res) => {
          _self.devsensors = res;
          _self.loading = false;
        });
      if (_self.is_radio) _self.get_radio_data();
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
    if(!this.ispro)
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
    if(!this.ispro)
      return;
    var _self = this;
    if(_self.reloading)
      return;
    _self.reloading = true;
    _self.data_provider
    .get_dev_dhcp_info(_self.devid)
    .then((res) => {
      _self.dhcp_server_available = Boolean(res.length);
      _self.dhcp_server_data = res;
      // loop in dhcp_server_data and create a new object with the data for chart for each dhcp server
      _self.reloading = false;
      _self.dhcp_server_data.forEach((element:any) => {
        if(element.pools.length>0){
          var pooldata=element.pools[0];
          element.chartpools = {
            labels: ['Used', 'Free'],
            datasets: [{
              backgroundColor: [ '#E46651','#41B883'],
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
    if(_self.ispro) _self.get_DHCP_data();
    this.updateData();
    this.data_interval = setInterval(() => {
      this.reloading = true;
      this.data_provider.get_dev_info(this.devid).then((res) => {
        _self.devdata = res;
        if ("is_radio" in res) _self.is_radio = res.is_radio;
        _self.interfaces = res.interfaces;
        _self.data_provider
          .get_dev_sensors(_self.devid, _self.delta, _self.total_type)
          .then((res) => {
            _self.devsensors = res;
            _self.loading = false;
            _self.reloading = false;

            if (_self.is_radio) _self.get_radio_data();

          });
      });
    }, 30000);
  }
  show_history(itme:any) {
    return
  }
  objectlen(object:any){
    return object ? Object.keys(object).length : 0;
  }
  strangth_at_rate_extract(data:string){
    return data ? data.split(',') : [];
  }
  ngOnDestroy() {
    clearInterval(this.data_interval);
  }
}
