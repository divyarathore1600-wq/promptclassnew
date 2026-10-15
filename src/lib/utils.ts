export function getGrade(percentage: number): string {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
}

export function getGradeColor(percentage: number): string {
  if (percentage >= 80) return 'bg-success-100 text-success-700';
  if (percentage >= 60) return 'bg-primary-100 text-primary-700';
  if (percentage >= 40) return 'bg-warning-100 text-warning-700';
  return 'bg-error-100 text-error-700';
}

export function getAttendanceColor(percentage: number): string {
  if (percentage >= 75) return 'bg-success-100 text-success-700';
  if (percentage >= 60) return 'bg-warning-100 text-warning-700';
  return 'bg-error-100 text-error-700';
}

export function getAttendanceBarColor(percentage: number): string {
  if (percentage >= 75) return 'bg-success-500';
  if (percentage >= 60) return 'bg-warning-500';
  return 'bg-error-500';
}

export function getAssignmentStatusColor(status: string): string {
  switch (status) {
    case 'submitted':
      return 'bg-primary-100 text-primary-700';
    case 'graded':
      return 'bg-success-100 text-success-700';
    case 'pending':
      return 'bg-warning-100 text-warning-700';
    default:
      return 'bg-ink-100 text-ink-600';
  }
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
