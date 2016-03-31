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

const names = (ps) => {
  return ps.map(p => p.verified.name)
}

test('working', t => {
  t.ok(u.announce)
  t.ok(u.see)
  t.ok(u.ack)
  t.end()
})

test('verified + announce() and filter(\'announce\') work together', t => {
  t.plan(3)
  var log = makeLog()
  var hy = hyphy(log)
  var kp = halite.signKeypair()
  var pk = halite.pk(kp)
  u.verified(hy)
    .filter(u.type('announce'))
    .map(u.presence)
    .onValue(p => {
      t.deepEqual(p.publicKey, kp.publicKey)
    })
  u.announce(log, kp, payload, (err, node) => {
    t.notOk(err, 'should see no err')
    t.ok(node, 'should see node')
  })
})

function testReaction (fn, ty, t) {
  t.plan(3)
  var log = makeLog()
  var hy = hyphy(log)
  var kp = halite.signKeypair()
  var kp2= halite.signKeypair()
  u.verified(hy)
    .filter(u.type(ty))
    .map(u.presence)
    .onValue(p => {
      t.deepEqual(p.publicKey, halite.pk(kp2))
    })
  u.announce(log, kp, payload, (err, node) => {
    fn(log, kp2, node.key, payload, (err, node) => {
      t.notOk(err)
      t.ok(node)
    })
  })
}

test('see() and filter(\'see\') work together', t => {
  testReaction(u.see, 'see', t)
})

test('ack() and filter(\'ack\') work together', t => {
  testReaction(u.ack, 'ack', t)
})

test('belongsTo => mine works to filter stream', t => {
  var log = makeLog()
  var hy = hyphy(log)
  var kp = halite.signKeypair()
  var kp2= halite.signKeypair()
  var my_pk = kp.publicKey
  var mine = u.belongsTo(my_pk)

  u.verified(hy)
    .filter(mine)
    .onValue(m => {
      t.deepEqual(m.value.presence.publicKey, my_pk, 'this is my message')
      t.end()
    })
  u.announce(log, kp2)
  u.announce(log, kp)
})

test('filter(not(mine)) works as well', t => {
  var log = makeLog()
  var hy = hyphy(log)
  var kp = halite.signKeypair()
  var kp2= halite.signKeypair()
  var my_pk = kp.publicKey
  var your_pk = kp2.publicKey
  var mine = u.belongsTo(my_pk)

  u.verified(hy)
    .filter(u.not(mine))
    .onValue(m => {
      t.deepEqual(m.value.presence.publicKey, your_pk)
      t.end()
    })
  u.announce(log, kp2)
  u.announce(log, kp)
})


test('library initializes + exposes things + we can announce()', t => {
  var id = halite.signKeypair()
  var log = makeLog()
  var pr = l(log, id, payload)
  t.ok(pr)
  t.ok(pr.announce)
  t.ok(pr.presenceS)
  pr.announce()
  t.end()
})

//test('three instances will be notified of one another', t => {
//  t.plan(9)
//  var log = makeLog()
//  var id1 = halite.signKeypair()
//  var id2 = halite.signKeypair()
//  var id3 = halite.signKeypair()
//  var pr1 = l(log, id1, { name: 'elsehow' })
//  var pr2 = l(log, id2, { name: 'harperj' })
//  var pr3 = l(log, id3, { name: 'mminsky' })
//  function check (names) {
//    t.ok(names.indexOf('elsehow')>-1, 'see elsehow')
//    t.ok(names.indexOf('harperj')>-1, 'see harperj')
//    t.ok(names.indexOf('mminsky')>-1, 'see mminsky')
//  }
//  function checkOnThree (pr) {
//    pr.presenceS
//      .map(names)
//      .filter(ns => ns.length == 3)
//      .onValue(check)
//  }
//  pr1.announce()
//  pr2.announce()
//  pr3.announce()
//  checkOnThree(pr1)
//  checkOnThree(pr2)
//  checkOnThree(pr3)
//})

test('one party can leave; other parties will pick up on this when one of them announce()s', t => {
  var log = makeLog()
  var id1 = halite.signKeypair()
  var id2 = halite.signKeypair()
  var id3 = halite.signKeypair()
  var pr1 = l(log, id1, { name: 'elsehow' })
  var pr2 = l(log, id2, { name: 'harperj' })
  var pr3 = l(log, id3, { name: 'mminsky' })
  pr1.presenceS
    .map(m => m.value.presence.verified.name)
    .log('pr1 sees')
  //pr1.presenceS.map(names).log('pr1 sees')
  //pr2.presenceS.map(names).log('pr2 sees')
  pr1.announce()
  pr2.announce()
  pr3.announce()
  pr3 = null // mminsky leaves :'( RIP
  pr1.announce() // now, when pr1 announces,
  t.end()
})
