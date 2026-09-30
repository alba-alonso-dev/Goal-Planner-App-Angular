import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardComponent } from './dashboard.component';
import {
  clickButton,
  mockGoalResponse,
  mockReminderResponse,
  mockTaskResponse,
  provideDataTesting,
  signInTestUser
} from '../../../../testing/fixtures';

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let element: HTMLElement;
  let httpTesting: HttpTestingController;

  const flushAll = () => {
    httpTesting
      .expectOne('/api/tasks')
      .flush([mockTaskResponse, { ...mockTaskResponse, taskId: 2, taskName: 'Pay the rent', dueDate: '2026-06-05' }]);
    httpTesting.expectOne('/api/goals').flush([mockGoalResponse]);
    httpTesting.expectOne('/api/reminders').flush([mockReminderResponse]);
  };

  beforeEach(async () => {
    // jsdom no dibuja en <canvas>: Chart.js no puede crear las gráficas (y lo avisa por consola)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    TestBed.configureTestingModule({ imports: [DashboardComponent], providers: provideDataTesting() });
    httpTesting = TestBed.inject(HttpTestingController);
    signInTestUser();
    fixture = TestBed.createComponent(DashboardComponent);
    element = fixture.nativeElement;
    await fixture.whenStable();
    flushAll();
    await fixture.whenStable();
  });

  afterEach(() => {
    httpTesting.verify();
    vi.restoreAllMocks();
  });

  it('shows the totals of the three collections', () => {
    const totalTasks = element.querySelector('.card-text')?.textContent?.trim();
    expect(totalTasks).toBe('2');
    // Goal a mitad (1 de 2 milestones) y recordatorio para mañana
    expect(element.textContent).toContain('50%');
    expect(element.textContent).toMatch(/Tomorrow:\s*1/);
  });

  it('lists overdue items in "Needs Attention"', () => {
    expect(element.textContent).toContain('Overdue task');
    expect(element.textContent).toContain('Pay the rent');
  });

  it('reloads everything on Refresh', async () => {
    clickButton(element, 'Refresh');
    flushAll();
    await fixture.whenStable();
    expect(element.textContent).toContain('Pay the rent');
  });
});
