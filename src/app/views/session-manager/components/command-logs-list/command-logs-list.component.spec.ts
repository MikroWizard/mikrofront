import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommandLogsListComponent } from './command-logs-list.component';

describe('CommandLogsListComponent', () => {
  let component: CommandLogsListComponent;
  let fixture: ComponentFixture<CommandLogsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommandLogsListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CommandLogsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
