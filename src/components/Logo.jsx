export default function Logo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Sun */}
      <circle cx="32" cy="26" r="11" fill="#F5B942" />
      {/* Palm trunk */}
      <path d="M32 34 C 30 42, 30 50, 28 58" stroke="#A56A3A" strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* Palm fronds */}
      <path d="M32 34 C 24 30, 18 30, 14 34" stroke="#1D9E75" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M32 34 C 24 38, 19 40, 16 46" stroke="#1D9E75" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M32 34 C 40 30, 46 30, 50 34" stroke="#1D9E75" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M32 34 C 40 38, 45 40, 48 46" stroke="#1D9E75" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M32 34 C 32 28, 32 24, 32 20" stroke="#1D9E75" strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* Upward trend line (the "planning" bit) */}
      <path d="M10 56 L 22 48 L 32 52 L 44 40 L 56 32" stroke="#3B6D11" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="56" cy="32" r="3" fill="#3B6D11" />
    </svg>
  )
}
