/*
 * IdPlatformKit's mark, from the org's avatar: two blue blocks over a block
 * split diagonally, green and ink. On a dark background, the ink part is
 * drawn light (`ink`).
 */
export const LogoIcon = ({
  size = 28,
  ink = '#111112',
}: {
  size?: number;
  ink?: string;
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="-14 0 148 148"
    width={size}
    height={size}
    fill="none"
    aria-hidden="true"
    style={{ flexShrink: 0 }}
  >
    <rect x="0" y="0" width="55" height="55" rx="2" fill="#2574F8" />
    <rect x="65" y="0" width="55" height="55" rx="2" fill="#2574F8" />
    <rect x="0" y="64" width="120" height="83" rx="2" fill="#42D085" />
    <path d="M120 64v81a2 2 0 0 1-2 2H38z" fill={ink} />
  </svg>
);
