import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "-";
    return new Intl.DateTimeFormat("en-PK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(d);
  } catch {
    return "-";
  }
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "-";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "-";
    return new Intl.DateTimeFormat("en-PK", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "-";
  }
}

export function formatPhoneNumber(phone: string): string {
  // Format Pakistani phone numbers: 03XX-XXXXXXX
  if (phone.length === 11 && phone.startsWith("0")) {
    return `${phone.slice(0, 4)}-${phone.slice(4)}`;
  }
  return phone;
}

export function formatCNIC(cnic: string): string {
  // Format CNIC: XXXXX-XXXXXXX-X
  if (cnic.length === 13) {
    return `${cnic.slice(0, 5)}-${cnic.slice(5, 12)}-${cnic.slice(12)}`;
  }
  return cnic;
}

// Input masking for CNIC (XXXXX-XXXXXXX-X)
export function maskCNIC(value: string): string {
  // Remove all non-digits
  const digits = value.replace(/\D/g, "");

  // Apply mask
  let masked = "";
  for (let i = 0; i < digits.length && i < 13; i++) {
    if (i === 5) masked += "-";
    if (i === 12) masked += "-";
    masked += digits[i];
  }
  return masked;
}

// Validate CNIC format
export function isValidCNIC(cnic: string): boolean {
  const pattern = /^\d{5}-\d{7}-\d{1}$/;
  return pattern.test(cnic);
}

// Input masking for Pakistani phone (03XX-XXXXXXX or +92-3XX-XXXXXXX)
export function maskPhone(value: string): string {
  // Remove all non-digits except +
  let digits = value.replace(/[^\d+]/g, "");

  // Handle +92 prefix
  if (digits.startsWith("+92")) {
    digits = digits.substring(3);
    const clean = digits.replace(/\D/g, "");
    let masked = "+92-";
    for (let i = 0; i < clean.length && i < 10; i++) {
      if (i === 3) masked += "-";
      masked += clean[i];
    }
    return masked;
  }

  // Handle local format (03XX-XXXXXXX)
  const clean = digits.replace(/\D/g, "");
  let masked = "";
  for (let i = 0; i < clean.length && i < 11; i++) {
    if (i === 4) masked += "-";
    masked += clean[i];
  }
  return masked;
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email);
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function calculateAge(dateOfBirth: string | Date): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

export function getAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // If current month is before April, academic year started last year
  if (month < 3) {
    return `${year - 1}-${year}`;
  }
  return `${year}-${year + 1}`;
}

export function generateReceiptNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RCP-${timestamp}-${random}`;
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function getStatusColor(
  status: string
):
  | "default"
  | "primary"
  | "secondary"
  | "error"
  | "info"
  | "success"
  | "warning" {
  const statusColors: Record<
    string,
    | "default"
    | "primary"
    | "secondary"
    | "error"
    | "info"
    | "success"
    | "warning"
  > = {
    ACTIVE: "success",
    INACTIVE: "default",
    PENDING: "warning",
    PAID: "success",
    PARTIAL: "info",
    OVERDUE: "error",
    CANCELLED: "default",
    PRESENT: "success",
    ABSENT: "error",
    LATE: "warning",
    LEAVE: "info",
    HALF_DAY: "warning",
    RESOLVED: "success",
    IN_PROGRESS: "info",
    CLOSED: "default",
    GRADUATED: "primary",
    TRANSFERRED: "secondary",
    EXPELLED: "error",
    DROPPED: "default",
  };

  return statusColors[status] || "default";
}

export function getMonthName(month: number): string {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return months[month] || "";
}

export function getDayName(day: number): string {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[day] || "";
}

export function parseQueryParams(
  searchParams: URLSearchParams
): Record<string, string> {
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

export function buildQueryString(
  params: Record<string, string | number | boolean | undefined>
): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, String(value));
    }
  });
  return searchParams.toString();
}
