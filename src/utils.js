const halite = require('halite')
const equal  = require('deep-equal')
const md5     = require('md5')

function msg (kp, type, payload) {
  var str = JSON.stringify(payload)
  var sk = halite.sk(kp)
  var signed = halite.sign(str, sk)
  return {
    type: type,
    presence: {
      publicKey: halite.serialize(halite.pk(kp)),
      signed: halite.serialize(signed),
    },
  }
}

function presence (node) {
  return node.value.presence
}

function deserialize (m) {
  m.value.presence.publicKey = halite.deserialize(m.value.presence.publicKey)
  m.value.presence.signed = halite.deserialize(m.value.presence.signed)
  return m
}

function verify (m) {
  var pk = m.value.presence.publicKey
  var sig = m.value.presence.signed
  var v = halite.verify(sig, pk)
  var obj = null
  try {
    obj = JSON.parse(
      v.replace(/\\'/g, "'")
    )
  } catch (e) {
    obj = {}
  }
  m.value.presence.verified = obj
  return m
}

function announce (log, kp, payload, cb) {
  var m = msg(kp, 'announce', payload)
  log.add(null, m, cb)
}

function see (log, kp, mkey, payload, cb) {
  var m = msg(kp, 'see', payload)
  log.add([mkey], m, cb)
}

function ack (log, kp, mkey, payload, cb) {
  var m = msg(kp, 'ack', payload)
  log.add([mkey], m, cb)
}

function type (t) {
  return (m) => {
    return m.value.type === t
  }
}

function belongsTo (pk) {
  return (m) => {
    return equal(m.value.presence.publicKey, pk)
  }
}

function not (f) {
  return (x) => {
    return !f(x)
  }
}

function empty (l) {
  return l.length == 0
}

function accum (acc, cur) {
  acc.push(cur)
  return acc
}

function keyByPubkeys (acc, cur) {
  cur.forEach(p => {
    acc[md5(p.publicKey)] = p
  })
  return acc
}

function listify (obj) {
  var l = []
  for (var key in obj) {
    l.push(obj[key]);
  }
  return l
}

function skipDuplicatesDeep () {
  var last = null
  return (l) => {
    var f = equal(l, last)
    last = l
    return !f
  }
}

function uniqueIds (rxS) {
  return rxS
    .map(ns => ns.map(presence))
    //.scan(keyByPubkeys, {})
    //.map(listify)
    //.filter(skipDuplicatesDeep())
}


function responses (m, ms) {
  var k = m.key
  return ms.filter(m => m.links[0] === k)
}

function originalAndResponses (m, ms) {
  var rs = responses(m, ms)
  rs.push(m)
  return rs
}

function last (l) {
  return l[l.length-1]
}

function truthy (x) {
  return !!x
}

// turns a stream of nodes nS into a stream of verified nodes
function verified (nS) {
  return nS
    .map(deserialize)
    .map(verify)
    .filter(m => !!m.value.presence.verified)
}

function addressedTo (child, parent) {
  console.log('hi addressed to here', child.length)
  if (parent.key === child.links[0]) {
    return child
  }
  return
}

module.exports = {
  msg: msg,
  presence: presence,
  announce: announce,
  see: see,
  ack: ack,
  type: type,
  belongsTo: belongsTo,
  deserialize: deserialize,
  not: not,
  empty: empty,
  last: last,
  accum: accum,
  uniqueIds: uniqueIds, 
  originalAndResponses: originalAndResponses,
  truthy: truthy,
  verified: verified,
  addressedTo: addressedTo,
}
