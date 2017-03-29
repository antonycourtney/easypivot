/* @flow */

/*
 * main module for render process
 */

import * as styles from '../less/app.less'  // eslint-disable-line
require('../less/sidebar.less')
require('../less/columnSelector.less')
require('../less/columnList.less')
require('../less/singleColumnSelect.less')
require('../less/modal.less')

require('babel-polyfill')

import * as React from 'react'
import * as ReactDOM from 'react-dom'
import OneRef from 'oneref'
import AppPane from './components/AppPane'
import PivotRequester from './PivotRequester'
import AppState from './AppState'

import * as reltab from './reltab' // eslint-disable-line
import * as reltabElectron from './reltab-electron'
import * as actions from './actions'

const remote = require('electron').remote

const remoteInitMain = remote.getGlobal('initMain')
const remoteErrorDialog = remote.getGlobal('errorDialog')

const initMainProcess = (targetPath): Promise<reltab.FileMetadata> => {
  return new Promise((resolve, reject) => {
    remoteInitMain(targetPath, (err, mdStr) => {
      if (err) {
        console.error('initMain error: ', err)
        reject(err)
      } else {
        const md = JSON.parse(mdStr)
        resolve(md)
      }
    })
  })
}

const init = () => {
  const targetPath = remote.getCurrentWindow().targetPath
  console.log('renderMain: target path: ', targetPath)

  const appState = new AppState()
  const stateRef = new OneRef.Ref(appState)
  const updater = OneRef.refUpdater(stateRef)

  ReactDOM.render(
    <OneRef.AppContainer appClass={AppPane} stateRef={stateRef} />,
    document.getElementById('app')
  )

  // and kick off main process initialization:
  initMainProcess(targetPath)
    .then(md => {
      const tableName = md.tableName
      const baseQuery = reltab.tableQuery(tableName)

      const rtc = reltabElectron.init()

      // module local to keep alive:
      var pivotRequester: ?PivotRequester = null  // eslint-disable-line

      actions.initAppState(rtc, md.tableName, baseQuery, updater)
        .then(() => {
          pivotRequester = new PivotRequester(stateRef) // eslint-disable-line
        })
    })
    .catch(err => {
      remoteErrorDialog('Error initializing Tad', err.message, true)
    })
}

init()
