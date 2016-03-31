const u       = require('./utils.js')
const hyphy   = require('hyphy')
const Kefir   = require('kefir')
const flatten = require('lodash.flatten')

module.exports = (log, identity, payload) => {

  var nodeS = u.verified(hyphy(log))
  var announceS = nodeS.filter(u.type('announce'))
  var seeS = nodeS.filter(u.type('see'))
  var ackS = nodeS.filter(u.type('ack'))

  var mine = u.belongsTo(identity.publicKey)
  var myAnnounceS = announceS.filter(mine)
  var mySeeS = seeS.filter(mine)

  function announce_ () {
    u.announce(log, identity, payload)
  }

  function see_ (m) {
    u.see(log, identity, m.key, payload)
  }

  function ack_ (m) {
    u.ack(log, identity, m.key, payload)
  }

  // responses to my announces
  var seeToMeS = seeS
      .sampledBy(myAnnounceS)
      .combine(myAnnounceS, u.addressedTo)
      .filter(u.truthy)
  // acks to my sees
  var ackToMeS = ackS
      .combine(seeS.filter(mine), u.addressedTo)
      .filter(u.truthy)
  // all reactions to my actions
  var reactions = Kefir.merge([
    seeToMeS,
    ackToMeS,
    announceS.filter(mine),
    seeS.filter(mine)
  ])

  // side effects -----------------------------
  // see all announces that aren't mine
  announceS.filter(u.not(mine)).onValue(see_)
  // ack sees that relate to one of my announces
  seeToMeS.onValue(ack_)

  return {
    // presenceS is a set of identities
    // the union of all reactions i observe
    presenceS: reactions //u.uniqueIds(reactions)
    ,
    // and a function to announce
    announce: announce_,
  }

}
