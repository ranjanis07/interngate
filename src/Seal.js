export default function Seal() {
  return (
    <svg className="seal" viewBox="0 0 100 100" aria-label="Confirmed">
      <circle cx="50" cy="50" r="46" fill="none" stroke="#B98A2C" strokeWidth="2" strokeDasharray="3 4" />
      <circle cx="50" cy="50" r="34" fill="none" stroke="#B98A2C" strokeWidth="1.5" />
      <path
        d="M37 51 L46 60 L64 40"
        fill="none"
        stroke="#B98A2C"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}