/**
 * The Nooreign mark: a gold ring holding a smaller eye — the observatory watching
 * its own instrumentation. Drawn rather than imported so it renders identically on
 * the server, in the favicon, and inside the banner generator.
 */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="Nooreign"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Nooreign</title>
      <circle cx="16" cy="16" r="14.25" stroke="#D9A441" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="9.5" stroke="#5A6FD6" strokeWidth="1" strokeDasharray="2 3" />
      <path
        d="M7.5 16c2.6-3.9 5.4-5.9 8.5-5.9S21.9 12.1 24.5 16c-2.6 3.9-5.4 5.9-8.5 5.9S10.1 19.9 7.5 16Z"
        stroke="#EDE4D3"
        strokeWidth="1.4"
      />
      <circle cx="16" cy="16" r="2.6" fill="#C8483F" />
      <path d="M16 1.75V5M16 27v3.25M1.75 16H5M27 16h3.25" stroke="#D9A441" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
