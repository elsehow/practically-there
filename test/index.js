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

test('one person should see the other two\'s identities', t => {
  var log = makeLog()
  var id1 = halite.signKeypair()
  var id2 = halite.signKeypair()
  var id3 = halite.signKeypair()
  var pr1 = l(log, id1, { name: 'elsehow' })
  var pr2 = l(log, id2, { name: 'harperj' })
  var pr3 = l(log, id3, { name: 'mminsky' })
  pr1.presenceS.map(names)
    .onValue(ns => {
      if (ns.length ===2) {
        t.ok(ns.indexOf('harperj')>-1)
        t.ok(ns.indexOf('mminsky')>-1)
      }
    })
  pr2.presenceS.map(names)
    .onValue(ns => {
      if (ns.length ===2) {
        t.ok(ns.indexOf('elsehow')>-1)
        t.ok(ns.indexOf('mminsky')>-1)
      }
    })
  pr3.presenceS.map(names)
    .onValue(ns => {
      if (ns.length ===2) {
        t.ok(ns.indexOf('elsehow')>-1)
        t.ok(ns.indexOf('harperj')>-1)
        t.end()
      }
    })
  //.map(u.presence)
  //.map(p=>p.verified.name)
  pr1.announce()
  pr2.announce()
  pr3.announce()
})

test('client will delete all of my old announces that don\'t reference my current announce', t => {
  var log = makeLog()
  var id1 = halite.signKeypair()
  var pr1 = l(log, id1, { name: 'elsehow' })
  var pr1 = l(log, id1, { name: 'elsehow' })
  pr1.announce()
  pr1.announceS.take(1).map(a => a.key)
    .onValue(akey => {
      log.db.db.get('!nodes!'+akey, (err, res) => {
        t.ok(res, 'now you see node')
      })
      pr1.announce()
      pr1.announceS.take(1).map(a => a.key)
        .onValue(new_akey => {
          log.db.db.get('!nodes!'+new_akey, (err, res) => {
            t.notOk(res, 'now you dont')
          })
        })

    })
  t.end()
})
