import {
  UnifiedThemeProvider,
  createBaseThemeOptions,
  createUnifiedTheme,
  genPageTheme,
  pageTheme as backstagePageThemes,
  palettes,
} from '@backstage/theme';
import { ThemeBlueprint } from '@backstage/plugin-app-react';
import DarkIcon from '@material-ui/icons/Brightness2';
import LightIcon from '@material-ui/icons/WbSunny';
import { dark, fonts, frame, light } from './tokens';

/*
 * Page headers: flat ink, the same for every kind of page, instead of
 * Backstage's coloured waves.
 */
function pageThemes(background: string) {
  const page = genPageTheme({ colors: [background], shape: 'none' });
  return Object.fromEntries(
    Object.keys(backstagePageThemes).map(key => [key, page]),
  );
}

const typography = {
  htmlFontSize: 16,
  fontFamily: fonts.sans,
  h1: { fontSize: 44, fontWeight: 680, marginBottom: 10 },
  h2: { fontSize: 32, fontWeight: 680, marginBottom: 8 },
  h3: { fontSize: 24, fontWeight: 650, marginBottom: 6 },
  h4: { fontSize: 20, fontWeight: 650, marginBottom: 6 },
  h5: { fontSize: 17, fontWeight: 650, marginBottom: 4 },
  h6: { fontSize: 15, fontWeight: 650, marginBottom: 2 },
};

const components = {
  MuiTypography: {
    styleOverrides: {
      root: { letterSpacing: 'normal' },
      h1: { letterSpacing: '-0.015em' },
      h2: { letterSpacing: '-0.015em' },
      h3: { letterSpacing: '-0.01em' },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: { textTransform: 'none' as const, fontWeight: 600 },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: { textTransform: 'none' as const, fontWeight: 600 },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: { fontFamily: fonts.mono, fontSize: '0.8em' },
    },
  },
};

export const idpkLightTheme = createUnifiedTheme({
  ...createBaseThemeOptions({
    palette: {
      ...palettes.light,
      background: { default: light.paper, paper: light.surface },
      primary: { main: light.action, dark: light.actionDeep },
      secondary: { main: light.action },
      success: { main: light.ready },
      warning: { main: light.progressing },
      error: { main: light.error },
      text: { primary: light.ink, secondary: light.muted },
      status: {
        ok: light.ready,
        warning: light.progressing,
        error: light.error,
        running: light.progressing,
        pending: light.progressing,
        aborted: light.subtle,
      },
      border: light.line,
      textContrast: light.ink,
      textSubtle: light.muted,
      textVerySubtle: light.line,
      highlight: light.actionLow,
      link: light.action,
      linkHover: light.actionDeep,
      navigation: {
        background: frame.light.background,
        indicator: frame.indicator,
        color: frame.text,
        selectedColor: frame.textStrong,
        navItem: { hoverBackground: frame.light.raised },
        submenu: { background: frame.light.raised },
      },
      pinSidebarButton: {
        icon: frame.light.background,
        background: frame.text,
      },
      tabbar: { indicator: light.action },
    },
    typography,
  }),
  defaultPageTheme: 'home',
  pageTheme: pageThemes(frame.light.background),
  fontFamily: fonts.sans,
  components,
});

export const idpkDarkTheme = createUnifiedTheme({
  ...createBaseThemeOptions({
    palette: {
      ...palettes.dark,
      background: { default: dark.paper, paper: dark.surface },
      primary: { main: dark.action, dark: dark.actionDeep },
      secondary: { main: dark.action },
      success: { main: dark.ready },
      warning: { main: dark.progressing },
      error: { main: dark.error },
      text: { primary: dark.ink, secondary: dark.muted },
      status: {
        ok: dark.ready,
        warning: dark.progressing,
        error: dark.error,
        running: dark.progressing,
        pending: dark.progressing,
        aborted: dark.subtle,
      },
      border: dark.line,
      textContrast: dark.ink,
      textSubtle: dark.muted,
      textVerySubtle: dark.line,
      highlight: dark.actionLow,
      link: dark.action,
      linkHover: dark.actionDeep,
      navigation: {
        background: frame.dark.background,
        indicator: frame.indicator,
        color: frame.text,
        selectedColor: frame.textStrong,
        navItem: { hoverBackground: frame.dark.raised },
        submenu: { background: frame.dark.raised },
      },
      pinSidebarButton: {
        icon: frame.dark.background,
        background: frame.text,
      },
      tabbar: { indicator: dark.action },
    },
    typography,
  }),
  defaultPageTheme: 'home',
  pageTheme: pageThemes(frame.dark.background),
  fontFamily: fonts.sans,
  components,
});

/*
 * Same names as the app's default themes ("light", "dark"), so they replace
 * them: the theme switcher in Settings keeps working, with our themes only.
 */
export const lightTheme = ThemeBlueprint.make({
  name: 'light',
  params: {
    theme: {
      id: 'light',
      title: 'Light',
      variant: 'light',
      icon: <LightIcon />,
      Provider: ({ children }) => (
        <UnifiedThemeProvider theme={idpkLightTheme}>
          {children}
        </UnifiedThemeProvider>
      ),
    },
  },
});

export const darkTheme = ThemeBlueprint.make({
  name: 'dark',
  params: {
    theme: {
      id: 'dark',
      title: 'Dark',
      variant: 'dark',
      icon: <DarkIcon />,
      Provider: ({ children }) => (
        <UnifiedThemeProvider theme={idpkDarkTheme}>
          {children}
        </UnifiedThemeProvider>
      ),
    },
  },
});
