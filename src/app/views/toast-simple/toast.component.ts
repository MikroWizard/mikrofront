import { ChangeDetectorRef, Component, ElementRef, forwardRef, Input, Renderer2 } from '@angular/core';

import { ToastComponent, ToasterService, ToastHeaderComponent, ToastBodyComponent, ToastCloseDirective,  ProgressComponent } from '@coreui/angular';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-toast-simple',
    templateUrl: './toast.component.html',
    styleUrls: ['./toast.component.scss'],
    providers: [{ provide: ToastComponent, useExisting: forwardRef(() => AppToastComponent) }],
    standalone: true,
    imports: [ToastHeaderComponent, ToastBodyComponent, ToastCloseDirective,  ProgressComponent,CommonModule]
})
export class AppToastComponent extends ToastComponent {

  @Input() closeButton = true;
  @Input() title = '';
  @Input() body = '';

  constructor(
    public override hostElement: ElementRef,
    public override renderer: Renderer2,
    public override toasterService: ToasterService,
    public override changeDetectorRef: ChangeDetectorRef
  ) {
    super(hostElement, renderer, toasterService, changeDetectorRef);
  }
}
