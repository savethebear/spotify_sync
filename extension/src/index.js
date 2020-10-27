import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import { ThemeProvider } from '@material-ui/styles';
import Theme from './assets/themes/Theme.js';
import MainInterface from './MainInterface.js';

ReactDOM.render(
  <React.StrictMode>
    <ThemeProvider theme={Theme}>
      <MainInterface />
    </ThemeProvider>
  </React.StrictMode>,
  document.getElementById('root')
);