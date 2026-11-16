import { makeStyles, useTheme } from '@material-ui/core';
import { LogoIcon } from './LogoIcon';

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  wordmark: {
    color: theme.palette.navigation.selectedColor,
    fontSize: 19,
    fontWeight: 680,
    letterSpacing: '-0.015em',
    whiteSpace: 'nowrap',
  },
}));

export const LogoFull = () => {
  const classes = useStyles();
  const theme = useTheme();
  return (
    <span className={classes.root}>
      <LogoIcon size={30} ink={theme.palette.navigation.selectedColor} />
      <span className={classes.wordmark}>IdPlatformKit</span>
    </span>
  );
};
