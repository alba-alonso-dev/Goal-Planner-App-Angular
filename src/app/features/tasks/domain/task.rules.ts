import { daysBetween } from '../../../shared/utils/date';
import { TaskFilter, TaskFrequency, TaskResponse, TaskStats, TaskView } from '../task.model';

// Reglas de negocio de las tareas. Funciones puras: todo lo que depende del tiempo recibe `now`.

/** La fecha de vencimiento es un día (sin hora): una tarea vence al terminar ese día, no al empezar. */
export function daysUntilDue(task: Pick<TaskResponse, 'dueDate'>, now: Date): number {
  return daysBetween(now, task.dueDate);
}

export function isTaskOverdue(task: Pick<TaskResponse, 'dueDate' | 'isCompleted'>, now: Date): boolean {
  return !task.isCompleted && daysUntilDue(task, now) < 0;
}

export function toTaskView(task: TaskResponse, now: Date): TaskView {
  return {
    ...task,
    description: task.description || '',
    progress: task.isCompleted ? 100 : 0,
    daysRemaining: daysUntilDue(task, now),
    isOverdue: isTaskOverdue(task, now)
  };
}

export function taskStats(tasks: readonly TaskView[]): TaskStats {
  const completed = tasks.filter(t => t.isCompleted).length;
  const overdue = tasks.filter(t => t.isOverdue).length;
  return { total: tasks.length, completed, overdue, pending: tasks.length - completed - overdue };
}

export function matchesTaskFilter(task: TaskView, filter: TaskFilter): boolean {
  switch (filter) {
    case 'pending':
      return !task.isCompleted && !task.isOverdue;
    case 'completed':
      return task.isCompleted;
    case 'overdue':
      return task.isOverdue;
    default:
      return true;
  }
}

export function matchesTaskSearch(task: TaskResponse, search: string): boolean {
  const term = search.trim().toLowerCase();
  return !term || task.taskName.toLowerCase().includes(term) || task.description?.toLowerCase().includes(term);
}

/** Pendientes primero; dentro de cada grupo, por fecha de vencimiento ascendente. No muta la entrada. */
export function sortTasks<T extends TaskResponse>(tasks: readonly T[]): T[] {
  return [...tasks].sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
}

export function selectTasks(
  tasks: readonly TaskView[],
  options: { frequency?: TaskFrequency; filter: TaskFilter; search: string }
): TaskView[] {
  return sortTasks(
    tasks.filter(
      t =>
        (!options.frequency || t.frequency === options.frequency) &&
        matchesTaskFilter(t, options.filter) &&
        matchesTaskSearch(t, options.search)
    )
  );
}
