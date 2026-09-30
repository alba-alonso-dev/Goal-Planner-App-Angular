import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GoalItemComponent } from './goal-item.component';
import { mockGoal } from '../../../../../testing/fixtures';

describe('GoalItemComponent', () => {
  let component: GoalItemComponent;
  let fixture: ComponentFixture<GoalItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GoalItemComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(GoalItemComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('goal', mockGoal);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
