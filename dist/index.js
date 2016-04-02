var practically = require('../src/index.js')
var halite   = require('halite')
var swarmlog = require('swarmlog')
var hyphy    = require('hyphy')
var memdb    = require('memdb')

var log = swarmlog({
  keys: require('./keys.json'),
  sodium: require('chloride/browser'),
  db: memdb(),
  valueEncoding: 'json',
  hubs: [ 'https://signalhub.mafintosh.com' ]
})

var randomString = require('random-string');
var name = randomString({length:4})
var id = halite.signKeypair()
var there = practically(log, id, {name:name})
document.body.innerHTML = name 
there.presenceS.onValue(ps => {
  var names = ps.map(p => p.value.presence.verified.name)
  document.body.innerHTML = name + JSON.stringify(names)
})
there.announce()
setInterval(there.announce, 1000)
console.log('launched')
