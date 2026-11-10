// Formatting utilities for Scope3Track

export function formatKgCO2e(value: number | undefined | null, decimals = 2): string {
  if (value === undefined || value === null || isNaN(value)) return '0.00 kg CO₂e';
  if (value >= 1000) {
    const tonnes = value / 1000;
    return `${tonnes.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} t CO₂e`;
  }
  return `${value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} kg CO₂e`;
}

export function formatMethodEmissions(value: number | undefined | null, decimals = 2): string {
  if (value === undefined || value === null || isNaN(value) || value <= 0) {
    return 'Not used';
  }
  const tonnes = value / 1000;
  return `${tonnes.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} t CO₂e`;
}

export function formatNumber(value: number | undefined | null, decimals = 2): string {
  if (value === undefined || value === null || isNaN(value)) return '0';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

export function formatCurrency(value: number | undefined | null, currency = 'INR'): string {
  if (value === undefined || value === null || isNaN(value)) return `${currency} 0.00`;
  return `${currency} ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string | undefined | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
