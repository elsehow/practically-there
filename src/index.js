const u       = require('./utils.js')
const hyphy   = require('hyphy')

module.exports = (log, identity, payload) => {

  var nodeS = u.verified(hyphy(log))
  var announceS = nodeS.filter(u.type('announce'))
  var seeS = nodeS.filter(u.type('see'))

  var mine = u.belongsTo(identity.publicKey)
  var myAnnounceS = announceS.filter(mine)
  var notMyAnnounceS = announceS.filter(u.not(mine))
  //var mySeeS = seeS.filter(mine)
  // things others publish
  var notMySeeS = seeS.filter(u.not(mine))

  var lastAnnounce = null

  function announce_ () {
    u.announce(log, identity, payload, (err, node) => {
      lastAnnounce = node
    })
  }

  function see_ (m) {
    u.see(log, identity, m.key, payload)
  }

  function del (k, cb) {
    log.db.db.del('!nodes!'+k, cb)
  }

  function deleteOld () {
    myAnnounceS.scan(u.accum, [])
      .filter(as => {
        if (lastAnnounce) {
          return as.filter(a => {
            return a.key !== lastAnnounce.key
          })
        }
        return
      })
      .onValue(as => {
        as.forEach(as => {
          del(as.key, _ => {})
        })
      })
  }

  // side effects -----------------------------
  // see all announces that aren't mine
  notMyAnnounceS.onValue(see_)
  myAnnounceS.onValue(deleteOld)

  return {

    // presenceS is a set of identities
    // the union of all reactions i observe
    presenceS: notMySeeS
      .scan(u.accum, [])
      .map(ns => {
        if (lastAnnounce) {
          return ns.filter(n => {
            return n.links[0] === lastAnnounce.key
          })
        }
        return []
      })
      .filter(u.not(u.empty))
    ,

    // and a function to announce
    announce: announce_
    ,

    announceS: announceS
    ,

    off: () => {
      notMyAnnounceS.offValue(see_)
    },

    on: () => {
      notMyAnnounceS.onValue(see_)
    },

    deleteOld: deleteOld,
  }

}
