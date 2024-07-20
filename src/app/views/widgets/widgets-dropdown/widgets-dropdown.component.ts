import {
  AfterContentInit,
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  Input,
  ViewChild
} from '@angular/core';
import { getStyle } from '@coreui/utils';
import { ChartjsComponent } from '@coreui/angular-chartjs';
import { dataProvider } from '../../../providers/mikrowizard/data';

@Component({
  selector: 'app-widgets-dropdown',
  templateUrl: './widgets-dropdown.component.html',
  styleUrls: ['./widgets-dropdown.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default
})
export class WidgetsDropdownComponent implements OnInit, AfterContentInit {

  constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private data_provider: dataProvider,

  ) {}

  data: any[] = [];
  options: any[] = [];
  @Input() devicedata: any;
  labels = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
    'January',
    'February',
    'March',
    'April'
  ];
  colors = [
    'primary',
    'success',
    'danger',
    'warning',
    'info',
    'dark',
    'primary',
    'success',
    'danger',
    'warning',
    'info',
    'dark',
    'primary',
    'success',
    'danger',
    'warning',
    'info',
    'dark',
    'primary',
    'success',
    'danger',
    'warning',
    'info',
    'light',
    'dark',
    'primary',
    'success',
    'danger',
    'warning',
    'info',
    'light',
    'dark'
  ];
  datasets = [
    [{
      label: 'My First dataset',
      backgroundColor: 'transparent',
      borderColor: 'rgba(255,255,255,.55)',
      pointBackgroundColor: getStyle('--cui-primary'),
      pointHoverBorderColor: getStyle('--cui-primary'),
      data: [65, 59, 84, 84, 51, 55, 40]
    }], [{
      label: 'My Second dataset',
      backgroundColor: 'transparent',
      borderColor: 'rgba(255,255,255,.55)',
      pointBackgroundColor: getStyle('--cui-info'),
      pointHoverBorderColor: getStyle('--cui-info'),
      data: [1, 18, 9, 17, 34, 22, 11]
    }], [{
      label: 'My Third dataset',
      backgroundColor: 'rgba(255,255,255,.2)',
      borderColor: 'rgba(255,255,255,.55)',
      pointBackgroundColor: getStyle('--cui-warning'),
      pointHoverBorderColor: getStyle('--cui-warning'),
      data: [78, 81, 80, 45, 34, 12, 40],
      fill: true
    }], [{
      label: 'My Fourth dataset',
      backgroundColor: 'rgba(255,255,255,.2)',
      borderColor: 'rgba(255,255,255,.55)',
      data: [78, 81, 80, 45, 34, 12, 40, 85, 65, 23, 12, 98, 34, 84, 67, 82],
      barPercentage: 0.7
    }]
  ];
  optionsDefault = {
    plugins: {
      legend: {
        display: false
      }
    },
    maintainAspectRatio: true,
    scales: {
      x: {
        grid: {
          display: false,
          drawBorder: false
        },
        ticks: {
          display: false
        }
      },
      y: {
        display: false,
        grid: {
          display: false
        },
        ticks: {
          display: false
        }
      }
    },
    elements: {
      line: {
        borderWidth: 1,
        tension: 0.4
      },
      point: {
        radius: 4,
        hitRadius: 10,
        hoverRadius: 6
      }
    }
  };
  logger(data: any){
    console.dir(data)
  }

  ngOnInit(): void {
    
    this.setData();
  }

  ngAfterContentInit(): void {
    this.changeDetectorRef.detectChanges();

  }
  
  convert_bw_human(mynumber:number=0,unit:string){
    const units = ['bit', 'Kib', 'Mib', 'Gib', 'Tib'];
    let unitIndex = 0;
    while (mynumber >= 1024 && unitIndex < units.length - 1) {
      mynumber /= 1024;
      unitIndex++;
    }
    switch (unit) {
      case 'rx':
        return  mynumber.toFixed(3) + ' ' + units[unitIndex];
        break;
      case 'tx':
        return mynumber.toFixed(3) + ' ' + units[unitIndex];
        break;
      default:
        return mynumber;
        break;
    }
  }
  check_options(sensor:string){
    if(sensor.indexOf('total')>-1)
      return true;
    else
      return false;
  }
  show_number(sensor:string,data:any){
    if(sensor=='rxp/txp-total'){
      let mynumber=data[sensor]["datasets"][0]["data"][data[sensor]["datasets"][0]["data"].length-1];
      let mynumber1=data[sensor]["datasets"][1]["data"][data[sensor]["datasets"][1]["data"].length-1];
      let res1=this.convert_bw_human(mynumber,data[sensor]["datasets"][0]['unit']);
      let res2=this.convert_bw_human(mynumber1,data[sensor]["datasets"][1]['unit']);
      return res1 + " / " + res2;
    }
   else if(sensor=='rx/tx-total'){
      let mynumber=data[sensor]["datasets"][0]["data"][data[sensor]["datasets"][0]["data"].length-1];
      let mynumber1=data[sensor]["datasets"][1]["data"][data[sensor]["datasets"][1]["data"].length-1];
      let res1=this.convert_bw_human(mynumber,data[sensor]["datasets"][0]['unit']);
      let res2=this.convert_bw_human(mynumber1,data[sensor]["datasets"][1]['unit']);
      return res1 + " / " + res2;
    }
    else{
      let mynumber=data[sensor]["datasets"][0]["data"][data[sensor]["datasets"][0]["data"].length-1];
      return mynumber
    }
  }

  count_calc(data:any){
    if(data.sensors.length > 4)
      return 2
    else if(data.sensors.length <= 4)
      return 3
    else
      return 3
  }

  setData() {
    for (let idx = 0; idx < 4; idx++) {
      this.data[idx] = {
        labels: idx < 3 ? this.labels.slice(0, 7) : this.labels,
        datasets: this.datasets[idx]
      };
    }
    this.setOptions();
  }

	show_date(date:string){
    if(typeof date === "undefined")
    return ""

    if(date=='')
			return ''
		else if(date.split("T").length>1)
			return "Last data : " + date.split("T")[0]
		else if(date.split("T").length==1)
			return "Last data : " + date.split("T").join(' ')	
    else
      return date;	
		
	
	}
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
          options.scales.x.grid = { display: false, drawTicks: false, drawBorder: false };
          options.scales.y.min = undefined;
          options.scales.y.max = undefined;
          options.elements = {};
          this.options.push(options);
          break;
        }
        case 4: {
          options.plugins={
            tooltip: {
                callbacks: {
                    label: function(context:any) {
                        const units = ['bit', 'Kib', 'Mib', 'Gib', 'Tib'];
                        let label = context.dataset.label || '';
                        var res=context.parsed.y
                        let unitIndex = 0;
                        // if (res>8) res /=8;
                        while (res >= 1024 && unitIndex < units.length - 1) {
                          res /= 1024;
                          unitIndex++;
                        }
                        switch (context.dataset.unit) {
                          case 'rx':
                            return "rx/s :" + res.toFixed(3) + ' ' + units[unitIndex];
                            break;
                          case 'tx':
                            return "tx/s :" + res.toFixed(3) + ' ' + units[unitIndex];
                            break;
                          case 'rxp':
                            return "rxp/s :" +  context.parsed.y;
                            break;
                          case 'txp':
                            return "txp/s :" +  context.parsed.y;
                            break;
                          default:
                            return context.parsed.y;
                            break;
                        }
                    }
                }
            }
            ,
            legend: {
              display:false
            }
        }
          options.scales={
            'x':{ display: false },
            'yA': {
              display: false ,
              stacked: true,
              position: 'left',
              type: 'linear',
              scaleLabel: {
                display: true,
              },
           },
            'yB': {
              display: false ,
              stacked: true,
              position: 'right',
              type: 'linear',
              
            }
          };
          options.elements.line.borderWidth = 2;
          options.elements.point.radius = 2;
          this.options.push(options);
          break;
        }
      }
    }
  }
}

@Component({
  selector: 'app-chart-sample',
  template: '<c-chart type="line" [data]="data" [options]="options" width="300" #chart></c-chart>'
})
export class ChartSample implements AfterViewInit {

  constructor() {}

  @ViewChild('chart') chartComponent!: ChartjsComponent;

  colors = {
    label: 'My dataset',
    backgroundColor: 'rgba(77,189,116,.2)',
    borderColor: '#4dbd74',
    pointHoverBackgroundColor: '#fff'
  };

  labels = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  data = {
    labels: this.labels,
    datasets: [{
      data: [65, 59, 84, 84, 51, 55, 40],
      ...this.colors,
      fill: { value: 65 }
    }]
  };

  options = {
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    elements: {
      line: {
        tension: 0.4
      }
    }
  };

  ngAfterViewInit(): void {
    setTimeout(() => {
      const data = () => {
        return {
          ...this.data,
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
          datasets: [{
            ...this.data.datasets[0],
            data: [42, 88, 42, 66, 77],
            fill: { value: 55 }
          }, { ...this.data.datasets[0], borderColor: '#ffbd47', data: [88, 42, 66, 77, 42] }]
        };
      };
      const newLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May'];
      const newData = [42, 88, 42, 66, 77];
      let { datasets, labels } = { ...this.data };
      // @ts-ignore
      const before = this.chartComponent?.chart?.data.datasets.length;
      // console.log('datasets, labels', datasets, labels)
      // @ts-ignore
      // this.data = data()
      this.data = {
        ...this.data,
        datasets: [{ ...this.data.datasets[0], data: newData }, {
          ...this.data.datasets[0],
          borderColor: '#ffbd47',
          data: [88, 42, 66, 77, 42]
        }],
        labels: newLabels
      };
      // console.log('datasets, labels', { datasets, labels } = {...this.data})
      // @ts-ignore
      setTimeout(() => {
        const after = this.chartComponent?.chart?.data.datasets.length;
      });
    }, 5000);
  }
}
