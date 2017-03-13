'use strict'

const reekoh = require('reekoh')
const _plugin = new reekoh.plugins.Service()

const request = require('request')
const isString = require('lodash.isstring')
const isArray = require('lodash.isarray')

_plugin.on('data', (data) => {
  let url = null

  if (_plugin.config.operationType === 'StaticMap') {
    // data validation
    if (
      data.travelMode || data.avoid || data.distanceBeforeFirstTurn || data.dbft || data.dateTime || data.dt || data.wp ||
      data.maxSolutions || data.maxSolns || data.optimize || data.optmz || data.timeType || data.tt || data.waypoint
    ) {
      return _plugin.logException(new Error('Bing Static Map Route Parameters not yet supported, if you want this feature contact Reekoh Management' + data))
    } else if (
      data.declutterPins || data.format || data.mapArea || data.mapSize ||
      data.pushpin || data.mapMetadata || data.highlightEntity || data.output
    ) {
      return _plugin.logException(new Error('Invalid data, use Alias of Map Parameters if available. i.e.: used \'pp\' for \'pushpin\'' + data))
    } else if (!data.centerPoint && !data.ma && !data.pp && !data.query) {
      return _plugin.logException(new Error('Invalid data, Map Parameter (centerPoint, pushpin, mapArea or Query) one of those parameter must be present' + data))
    } else if (
      data.centerPoint && data.ma && data.query || data.centerPoint &&
      data.ma || data.centerPoint && data.query || data.ma && data.query
    ) {
      return _plugin.logException(new Error('Invalid data, combination of required map parameter is invalid, please double Bing Imagery API documentation' + data))
    } else if (data.centerPoint && !isArray(data.centerPoint)) {
      return _plugin.logException(new Error('Invalid centerPoint parameter data' + data))
    } else if (data.ma && !isArray(data.ma)) {
      return _plugin.logException(new Error('Invalid mapArea parameter data' + data))
    } else if (data.query && !isString(data.query)) {
      return _plugin.logException(new Error('Invalid query parameter data' + data))
    } else if (data.pp && !isArray(data.pp)) {
      return _plugin.logException(new Error('Invalid pushpin parameter data' + data))
    } else if (data.o && data.o === 'xml') {
      return _plugin.logException(new Error('Invalid metadata type parameter, metadata only available to JSON' + data))
    }

    let mapArea = null
    let pushpin = null
    let mapSize = null

    if (data.ma) {
      mapArea = `${data.ma.join()}`
    }
    if (data.pp) {
      pushpin = `${data.pp.join('&pp=')}`
    }
    if (data.ms) {
      mapSize = `${data.ms.join()}`
    }

    url = `${_plugin.config.bingStaticMapURL}${data.imagerySet}`

    if (data.centerPoint && data.zoomLevel && !data.pp && !data.ma && !data.query) {       // Get a map that is centered at a specified point without pushpin
      url += `/${data.centerPoint}/${data.zoomLevel}?`
    } else if (data.centerPoint && data.zoomLevel && data.pp && !data.ma && !data.query) { // Get a map that is centered at a specified point with pushpin
      url += `/${data.centerPoint}/${data.zoomLevel}?pp=${pushpin}&`
    } else if (data.ma && !data.pp && !data.centerPoint && !data.query) {                  // Get a map that shows a specified map area without pushpin
      url += `?ma=${mapArea}&`
    } else if (data.ma && data.pp && !data.centerPoint && !data.query) {                   // Get a map that shows a specified map area with pushpin
      url += `?ma=${mapArea}pp=${pushpin}&`
    } else if (data.pp && !data.ma && !data.centerPoint && !data.query) {                  // Get a map with pushpins that does not specify a center point or map area.
      url += `?pp=${pushpin}&`
    } else if (data.query && !data.pp && !data.ma && !data.centerPoint) {                  // Get a map that is based on a query without pushpin.
      url += `/${data.query}?`
    } else if (data.query && data.pp && !data.ma && !data.centerPoint) {                   // Get a map that is based on a query with pushpin.
      url += `/${data.query}?pp=${pushpin}&`
    }

    // optional parameters
    let dcl = data.dcl ? data.dcl : ''
    let ms = mapSize || ''
    let ml = data.ml ? data.ml : ''
    let fmt = data.fmt ? data.fmt : ''
    let mmd = data.mmd ? data.mmd : ''
    let o = data.o ? data.o : ''

    url += `dcl=${dcl}&ms=${ms}&ml=${ml}&fmt=${fmt}&mmd=${mmd}&o=${o}&key=${_plugin.config.apiKey}`

    request.get({
      url: url,
      encoding: null,
      json: true
    }, (error, response, body) => {
      if (mmd && mmd === 1) {
        if (error) {
          _plugin.logException(error)
        } else if (body.statusCode !== 200) {
          _plugin.logException(new Error(body.errorDetails))
        }
      } else {
        if (error) {
          _plugin.logException(error)
        } else {
          // generate base64 url
          let imageResult = 'data:' + response.headers['content-type'] + ';base64,' + new Buffer(body).toString('base64')

          let result = {
            image: imageResult
          }
          _plugin.pipe(data, JSON.stringify(result))
            .then(() => {
              _plugin.log(JSON.stringify({
                title: 'Bing Maps Imagery Service Result',
                data: data,
                result: result
              }))
            })
            .catch((error) => {
              _plugin.logException(error)
            })
        }
      }
    })
  } else if (_plugin.config.operationType === 'ImageryMetadata') {
    if (data.o && data.o === 'xml') {
      return _plugin.logException(new Error('Invalid output parameter, metadata only available to JSON' + data))
    }
    if (data.centerPoint && !data.zl) {
      return _plugin.logException(new Error('Invalid data parameter, zoomLevel is required when centerPoint is present' + data))
    }
    if (!data.centerPoint && data.zl) {
      return _plugin.logException(new Error('Invalid data parameter, zoomLevel only required when centerPoint is present' + data))
    } else if (data.include || data.orientation || data.zoomLevel || data.output) {
      return _plugin.logException(new Error('Invalid data, use Alias of Parameters if available. i.e.: used \'zl\' for \'zoomLevel\'' + data))
    } else if (data.centerPoint && !isArray(data.centerPoint)) {
      return _plugin.logException(new Error('Invalid centerPoint parameter data' + data))
    }

    url = `${_plugin.config.bingImageryMetadataURL}${data.imagerySet}`

    if (data.centerPoint) {
      let cp = `${data.centerPoint.join()}`
      url += `/${cp}?zl=${data.zl}&`
    } else {
      url += `?`
    }

    let dir = data.dir ? data.dir : ''
    let incl = data.incl ? data.incl : ''
    let o = data.o ? data.o : ''

    url += `key=${_plugin.config.apiKey}&dir=${dir}&incl=${incl}&o=${o}`

    request.get({
      url: url,
      json: true
    }, (error, response, body) => {
      if (error) {
        _plugin.logException(error)
      } else if (body.statusCode !== 200) {
        _plugin.logException(new Error(body.errorDetails))
      } else {
        _plugin.pipe(data, JSON.stringify(body))
          .then(() => {
            _plugin.log(JSON.stringify({
              title: 'Bing Maps Imagery Service Result',
              data: data,
              result: body
            }))
          })
          .catch((error) => {
            _plugin.logException(error)
          })
      }
    })
  }
})

_plugin.once('ready', () => {
  _plugin.log('Bing Maps Imagery Service Initialized.')
  _plugin.emit('init')
})

module.exports = _plugin
