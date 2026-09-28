import { Directive, Input, TemplateRef, ViewContainerRef, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { UiModeService } from '../../providers/ui-mode.service';

@Directive({
  selector: '[mwMode]'
})
export class MwModeDirective implements OnInit, OnDestroy {
  private targetMode: string | string[] = 'both';
  private hasView = false;
  private sub?: Subscription;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private uiModeService: UiModeService
  ) {}

  @Input() set mwMode(mode: string | string[]) {
    this.targetMode = mode;
    this.updateView();
  }

  ngOnInit(): void {
    this.sub = this.uiModeService.mode$.subscribe(() => {
      this.updateView();
    });
  }

  private updateView(): void {
    const isVisible = this.uiModeService.isModeVisible(this.targetMode);
    if (isVisible && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!isVisible && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }

  ngOnDestroy(): void {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }
}
