import { Component, OnInit,OnDestroy, ViewChild, ElementRef } from "@angular/core";
import { UntypedFormControl, UntypedFormGroup } from "@angular/forms";
import { dataProvider } from "../../providers/mikrowizard/data";
import { loginChecker } from "../../providers/login_checker";
import { Router } from "@angular/router";
import { formatInTimeZone } from "date-fns-tz";
import { NgScrollbar } from "ngx-scrollbar";

@Component({
  templateUrl: "monitoring.component.html",
  styleUrls: ["monitoring.component.scss"],
})
export class MonitoringComponent implements OnInit,OnDestroy {
  public uid: number;
  public uname: string;
  public ispro: boolean = false;
  public tz: string;
  public copy_msg: any = false;
  public devices: any = false;
  public devicesearch:string='';
  public eventsall: any = false;
  public eventUnfixedsall: any = false;
  public list_update_timer : any;
  public timer_interval : any;
  public ECount: number = 0;
  public WCount: number = 0;
  public CCount: number = 0;
  public display: any;
  public selected_devid : number =0;
  public contexItem:any=false;
  public throttle:number = 10;
  public scrollUpDistance:number = 2;
  
  public devicespage:number=1;
  public scrollDownDistance:number = 2;

  public allallertpage:number=1;
  public allowinfinite:boolean=false;
  contextmenu : any= false;
  contextmainmenu: any= false;
  contextmenuX : any= 0;
  contextmenuY : any= 0;
  AutoScrollTimer:any=false;
  constructor(
    private data_provider: dataProvider,
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
      _self.ispro = res.ISPRO;
      // This is a pro Feature not availble for free users
      if (!_self.ispro)
        setTimeout(function () {
          _self.router.navigate(["dashboard"]);
        }, 100);
      _self.tz = res.tz;
      const userId = _self.uid;
    });
    //get datagrid data
    function isNotEmpty(value: any): boolean {
      return value !== undefined && value !== null && value !== "";
    }
  }
  @ViewChild("scrollable") scrollable: NgScrollbar;
  @ViewChild("scrollable2") scrollable2: NgScrollbar;

  public trafficRadioGroup = new UntypedFormGroup({
    trafficRadio: new UntypedFormControl("5m"),
  });

  ngOnInit(): void {
    this.initEvents();
    this.initAllalerts();
    this.initUnfixedalerts();
    this.update_tables();
    this.auto_scroll();
  }
  set_table_color(item:any,bypass=true){
    if('status' in item && item.status==true && bypass) {
      return 'light';
    }
    if(item.level=='Critical') return 'danger';
    else if(item.level=='Warning') return 'warning';
    else if(item.level=='Error') return 'danger';
    else return 'danger';
  }
  scroll() {
    this.scrollable.scrollTo({ bottom: 0, duration: 500 });
  }
  onrightClick(event:any,item:any,main=false){
    this.contexItem=item;
    this.contextmenuX=event.clientX
    this.contextmenuY=event.clientY
    if (!main){
      this.contextmenu=true;
      this.contextmainmenu=false;
    }
    else{
      this.contextmainmenu=true;
      this.contextmenu=false;
    }
  }
  //disables the menu
  disableContextMenu(){
    this.contexItem=false;
    this.contextmenu= false;
    this.contextmainmenu= false;
  }
  fix_event(){
    var _self=this;
    if (!this.contexItem)
      return
    this.data_provider.monitoring_events_fix(this.contexItem.id).then((res) => {
      if('status' in res && res['status']=='failed')
        return;
      _self.reload_data();
    });
  }
  initEvents() {
    var _self = this;
    //init radio buttons
    _self.ECount = 0;
    _self.WCount = 0;
    _self.CCount = 0;
    this.devicespage=1;
    this.data_provider.monitoring_devices_events(this.devicespage,this.devicesearch).then((res) => {
      _self.devices = res.map((d: any) => {
        d.ECount = 0;
        d.WCount = 0;
        d.CCount = 0;
        if (d.data)
          d.data.forEach((z: any) => {
            if (z.level == "Error") {
              d.ECount++;
              _self.ECount++;
            } else if (z.level == "Warning") {
              d.WCount++;
              _self.WCount++;
            } else if (z.level == "Critical") {
              d.CCount++;
              _self.CCount++;
            }
          });
        return d;
      });
    });
  }

  initAllalerts(){
    var _self = this;
    this.allowinfinite=false;
    this.data_provider.monitoring_all_events(_self.selected_devid,_self.allallertpage).then((res) => {
      var index=1;
      _self.eventsall = res.map((d: any) => {
        d.time = formatInTimeZone(
          d.eventtime.split(".")[0] + ".000Z",
          _self.tz,
          "yyyy-MM-dd HH:mm:ss"
        );
        if(d.fixtime)
          d.fixtime = formatInTimeZone(
            d.fixtime.split(".")[0] + ".000Z",
            _self.tz,
            "yyyy-MM-dd HH:mm:ss"
          );
        d.index = index++;
        return d
      });
      _self.auto_scroll();
    });
    setTimeout(function() {
      _self.allowinfinite=true;
      console.dir("allowing infinite")
    }, 1500);
  }

  auto_scroll(){
    var _self=this;
    this.AutoScrollTimer=setTimeout(function() {
      _self.scrollable.scrollTo({ bottom: 0, duration: 500 });
    }, 1000);
  }

  initUnfixedalerts(){
    var _self = this;
    this.data_provider.monitoring_unfixed_events(_self.selected_devid).then((res) => {
      var index=1;
      _self.eventUnfixedsall = res.map((d: any) => {
        d.time = formatInTimeZone(
          d.eventtime.split(".")[0] + ".000Z",
          _self.tz,
          "yyyy-MM-dd HH:mm:ss XXX"
        );
        d.index = index++;
        return d
      });
      setTimeout(function() {
        _self.scrollable2.scrollTo({ bottom: 0, duration: 500 });
      }, 100);
    });
  }

  timer(minute:any) {
    // let minute = 1;
    let seconds: number = minute * 60;
    let textSec: any = "0";
    let statSec: number = 60;
    var _self=this;
    const prefix = minute < 10 ? "0" : "";

    this.timer_interval = setInterval(() => {
      seconds--;
      if (statSec != 0) statSec--;
      else statSec = 59;

      if (statSec < 10) {
        textSec = "0" + statSec;
      } else textSec = statSec;

      this.display = `${prefix}${Math.floor(seconds / 60)}:${textSec}`;

      if (seconds == 0) {
        clearInterval(_self.timer_interval);
      }
    }, 1000);
  }
  filter_device(item:any){
    if(item == 0)
      this.selected_devid=0;
    else if ('devid' in item)
      this.selected_devid=item.devid;
    this.reload_data();
  }
  reload_data(){
    
    clearTimeout(this.list_update_timer);
    clearTimeout(this.timer_interval);
    console.dir("reloading data");
    this.allallertpage=1;
    this.initEvents();
    this.initAllalerts();
    this.initUnfixedalerts();
    this.update_tables();
  }
  go_device(){
    this.router.navigate(["/device-stats", { id: this.contexItem.devid }]);
  }

  go_logs(){
    this.router.navigate(["/devlogs", { devid: this.contexItem.devid }]);

  }
  update_tables(){
    // update initAllalerts and initUnfixedalerts  every 1 minute
    var _self = this;
    clearTimeout(this.list_update_timer);
    clearTimeout(this.timer_interval);
    this.timer(1)
    this.list_update_timer = setTimeout(() => {
      _self.allallertpage=1;
      _self.initEvents();
      _self.initAllalerts();
      _self.initUnfixedalerts();
      _self.update_tables();
    }, 60000);

  }

  onUp(ev:any) {
    if(!this.allowinfinite){
      console.dir("scroll up not allowed");
    }
    else{
    var _self = this;
    this.allallertpage++;
    this.data_provider.monitoring_all_events(_self.selected_devid,_self.allallertpage).then((res) => {
      var index=1;
      let eventsall = res.map((d: any) => {
        d.time = formatInTimeZone(
          d.eventtime.split(".")[0] + ".000Z",
          _self.tz,
          "yyyy-MM-dd HH:mm:ss"
        );
        if(d.fixtime)
          d.fixtime = formatInTimeZone(
            d.fixtime.split(".")[0] + ".000Z",
            _self.tz,
            "yyyy-MM-dd HH:mm:ss"
          );
        d.index = index++;
        return d
      });
      _self.eventsall.unshift(...eventsall);
      // re calculate index
      var index=1;
      _self.eventsall = _self.eventsall.map((d: any) => {
        d.index = index++;
        return d
      });
    });
  }

  }


  onDown(ev:any) {
    var _self = this;
    console.dir("scroll down");
    this.devicespage++;
    this.data_provider.monitoring_devices_events(this.devicespage).then((res) => {
      let devices = res;
      console.dir(_self.devices);
      console.dir(devices);
      _self.devices=_self.devices.concat(devices);
      console.dir(_self.devices);
    });
  }




  ngOnDestroy(){
    clearTimeout(this.list_update_timer);
    clearTimeout(this.timer_interval);
    this.eventsall=false;
    this.eventUnfixedsall=false;
    this.scrollable.update();
  }
}
