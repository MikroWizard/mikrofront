import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SessionsListComponent } from './sessions-list.component';

describe('SessionsListComponent', () => {
  let component: SessionsListComponent;
  let fixture: ComponentFixture<SessionsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SessionsListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SessionsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
