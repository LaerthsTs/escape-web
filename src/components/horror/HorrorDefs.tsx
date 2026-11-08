/**
 * Shared SVG filters. Mounted once by LayoutShell so `filter: url(#...)` works on every page.
 */
export function HorrorDefs() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute w-0 h-0 overflow-hidden" focusable="false">
      <defs>
        {/* Corroded, slightly boiling edges for display type */}
        <filter id="horror-rough" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3" result="noise">
            <animate attributeName="seed" values="3;7;11;3" dur="0.6s" repeatCount="indefinite" calcMode="discrete" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        {/* Gooey merge for blood pools */}
        <filter id="horror-goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" />
        </filter>
      </defs>
    </svg>
  );
}
