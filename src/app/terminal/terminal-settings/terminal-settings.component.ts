import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TerminalSettings } from '../terminal.service';

@Component({
  selector: 'app-terminal-settings',
  templateUrl: './terminal-settings.component.html',
  styleUrls: ['./terminal-settings.component.scss']
})
export class TerminalSettingsComponent implements OnInit {
  @Input() initialSettings!: TerminalSettings;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<TerminalSettings>();

  settings!: TerminalSettings;

  ngOnInit() {
    this.settings = { ...this.initialSettings };
  }

  onSave() {
    this.save.emit(this.settings);
    this.close.emit();
  }

  onClose() {
    this.close.emit();
  }
}
