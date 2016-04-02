const test     = require('tape')
const u        = require('../src/utils.js')
const hyperlog = require('hyperlog')
const hyphy    = require('hyphy')
const memdb    = require('memdb')
const uuid     = require('uuid')
const halite   = require('halite')
const l        = require('../src/index.js')

const makeLog = () => {
  return hyperlog(memdb(), {
    valueEncoding: 'json',
  })
}

const payload = {
  some: 'payload',
  very: 'nice',
}

const names = (ns) => {
  return ns.map(n => u.presence(n).verified.name)
}

var log = makeLog()
var id1 = halite.signKeypair()
var id2 = halite.signKeypair()
var id3 = halite.signKeypair()
var pr1 = l(log, id1, { name: 'elsehow' })
var pr2 = l(log, id2, { name: 'harperj' })
var pr3 = l(log, id3, { name: 'mminsky' })
pr1.presenceS.map(names).log('elsehow sees')
//.map(u.presence)
//.map(p=>p.verified.name)
pr1.announce()
pr1.announce()
pr1.announce()
