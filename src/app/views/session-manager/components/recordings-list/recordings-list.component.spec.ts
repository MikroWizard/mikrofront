import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecordingsListComponent } from './recordings-list.component';

describe('RecordingsListComponent', () => {
  let component: RecordingsListComponent;
  let fixture: ComponentFixture<RecordingsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecordingsListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecordingsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
