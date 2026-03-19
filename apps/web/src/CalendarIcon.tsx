export function CalendarIcon({ size = 28 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      style={{ display: "block" }}
    >
      <rect x="4" y="10" width="56" height="50" rx="4" fill="currentColor" />
      <rect x="16" y="4" width="6" height="12" rx="2" fill="currentColor" />
      <rect x="42" y="4" width="6" height="12" rx="2" fill="currentColor" />
      <path fill="#fff" d="M12 30h8v6h-8zm12 0h8v6h-8zm12 0h8v6h-8zm12 0h8v6h-8zM12 40h8v6h-8zm12 0h8v6h-8zm12 0h8v6h-8zm12 0h8v6h-8zM12 50h8v6h-8zm12 0h8v6h-8zm12 0h8v6h-8z" />
    </svg>
  );
}
