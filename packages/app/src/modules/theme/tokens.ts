/*
 * IdPlatformKit's visual identity, shared with the website
 * (idPlatformKit.github.io, src/styles/theme.css), from the logo: blue
 * #2574F8, green #42D085, ink #111112. Blue is for links and actions; green
 * only ever means "Ready", amber only "Progressing". On light backgrounds
 * both are darkened to keep text contrast at 4.5:1 or more.
 */
export const fonts = {
  sans: "'Schibsted Grotesk Variable', ui-sans-serif, system-ui, sans-serif",
  mono: "'JetBrains Mono Variable', ui-monospace, SFMono-Regular, monospace",
};

export const light = {
  ink: '#1b2433',
  paper: '#f7f8fa',
  surface: '#ffffff',
  action: '#1d63db',
  actionDeep: '#164fb0',
  actionLow: '#dde9fe',
  ready: '#137a4a',
  progressing: '#9a6412',
  error: '#b42318',
  line: '#d9dee6',
  muted: '#5d687a',
  subtle: '#8c96a6',
};

export const dark = {
  ink: '#f2f4f8',
  paper: '#141a24',
  surface: '#1f2734',
  action: '#6aa1ff',
  actionDeep: '#c9dcff',
  actionLow: '#13254a',
  ready: '#42d085',
  progressing: '#e3a948',
  error: '#f97066',
  line: '#313a49',
  muted: '#b8c0cc',
  subtle: '#8792a3',
};

/* The frame (sidebar and page headers) is the logo's ink in both modes. */
export const frame = {
  light: { background: '#111112', raised: '#26272b' },
  dark: { background: '#0b0b0c', raised: '#1f2026' },
  text: '#b8c0cc',
  textStrong: '#ffffff',
  indicator: '#2574f8',
};
