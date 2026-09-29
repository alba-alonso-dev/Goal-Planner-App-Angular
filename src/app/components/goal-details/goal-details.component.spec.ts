import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GoalDetailsComponent } from './goal-details.component';
import { mockGoal } from '../../../testing/fixtures';

describe('GoalDetailsComponent', () => {
  let component: GoalDetailsComponent;
  let fixture: ComponentFixture<GoalDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GoalDetailsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(GoalDetailsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('goal', mockGoal);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
