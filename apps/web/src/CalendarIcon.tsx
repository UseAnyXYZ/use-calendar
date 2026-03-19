export function CalendarIcon({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      {/* Calendar outline */}
      <rect
        x="20"
        y="28"
        width="88"
        height="80"
        rx="12"
        stroke="currentColor"
        strokeWidth="6"
      />
      <line
        x1="20"
        y1="48"
        x2="108"
        y2="48"
        stroke="currentColor"
        strokeWidth="6"
      />

      {/* Rings */}
      <line
        x1="40"
        y1="16"
        x2="40"
        y2="32"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <line
        x1="88"
        y1="16"
        x2="88"
        y2="32"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* Bash prompt */}
      <path
        d="M40 68 L56 78 L40 88"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="60"
        y1="86"
        x2="82"
        y2="86"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}
