// lib/appointment-status.ts

export function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    confirmed: 'bg-emerald-50 text-emerald-700',
    pending_payment: 'bg-amber-50 text-amber-700',
    completed: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-rose-50 text-rose-700',
  }
  const labels: Record<string, string> = {
    confirmed: 'Confirmed',
    pending_payment: 'Pending payment',
    completed: 'Completed',
    cancelled: 'Cancelled',
  }
  return {
    className: styles[status] || 'bg-gray-100 text-gray-600',
    label: labels[status] || status,
  }
}