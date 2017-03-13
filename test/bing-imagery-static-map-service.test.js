'use strict'

const amqp = require('amqplib')

let _app = null
let _channel = null
let _conn = null

describe('Bing Maps Imagery Service', function () {
  this.slow(5000)

  before('init', () => {
    process.env.OUTPUT_PIPES = 'Op1,Op2'
    process.env.LOGGERS = 'logger1,logger2'
    process.env.EXCEPTION_LOGGERS = 'exlogger1,exlogger2'
    process.env.BROKER = 'amqp://guest:guest@127.0.0.1/'
    process.env.CONFIG = '{"apiKey": "HPxUsxIW4KrWhv9Oy9m7~E4SZOfktKYEHwqiMiTPyTw~Ahk-k62SPI187r6k0FX7xOnr0CXKE4lJZ2Tc6ykj0a_AOcKk6RPFCgCli98z2zVi", "operationType": "StaticMap", ' +
      ' "bingStaticMapURL": "http://dev.virtualearth.net/REST/V1/Imagery/Map/"}'
    process.env.INPUT_PIPE = 'demo.pipe.service'
    process.env.OUTPUT_SCHEME = 'RESULT'
    process.env.OUTPUT_NAMESPACE = 'RESULT'
    process.env.ACCOUNT = 'demo account'

    amqp.connect(process.env.BROKER)
      .then((conn) => {
        _conn = conn
        return conn.createChannel()
      }).then((channel) => {
      _channel = channel
    }).catch((err) => {
      console.log(err)
    })
  })

  after('terminate child process', function (done) {
    _conn.close()
    done()
  })

  describe('#start', function () {
    it('should start the app', function (done) {
      this.timeout(8000)
      _app = require('../app')
      _app.once('init', done)
    })
  })

  describe('#data', () => {
    it('should process the data and send back a result', function (done) {
      this.timeout(15000)

      let dummyData = {
          imagerySet: 'road',
          centerPoint: [47.619048, -122.35384],
          zoomLevel: 15,
          pp: [
            '47.620495,-122.34931;21;AA',
            '47.619385,-122.351485;;AB',
            '47.616295,-122.3556;22'
          ]
      }
      _channel.sendToQueue('demo.pipe.service', new Buffer(JSON.stringify(dummyData)))

      setTimeout(done, 10000)
    })
  })
})
