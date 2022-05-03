const passport = require('passport');
const ObjectID = require('mongodb').ObjectID;
const LocalStrategy = require('passport-local');

const { Users } = require('./models');

module.exports = function(app) {
  passport.serializeUser((user, done) => {
    return done(null, user._id);
  });
  
  passport.deserializeUser((id, done) => {
    Users.findOne({ _id: new ObjectID(id) }, (err, user) => {
      return done(null, user);
    });
  });

  passport.use(new LocalStrategy(
    function(username, password, done) {
      Users.findOne({ username: username }, (err, user) => {
        if(err) {
          return done(err);
        }
        if(!user) {
          return done(null, false);
        }
        if(password !== user.password) {
          return done(null, false);
        }
        return done(null, user);
      });
    }
  ));
}