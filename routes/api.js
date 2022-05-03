'use strict';

const { Users, Polls } = require('../models');
const passport = require('passport');
const bodyParser = require('body-parser');
const ObjectID = require('mongodb').ObjectID;

function ensureAuthenticated(req, res, next) {
  if(req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

function ensureNotAuthenticated(req, res, next) {
  if(!req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
}

module.exports = function(app) {
  app.use(bodyParser.urlencoded({ extended: true }));

  app.route('/').get((req, res) => {
    res.sendFile(process.cwd() + '/views/html/index.html');
  });

  app.route('/api/polls')
  .get((req, res) => {

    Polls.find({}, (err, polls) => {
      if(err) {
        console.log(err);
        return;
      }
      res.send(polls);
    });
  });

  app.route('/api/info').get((req, res) => {
    let info = {};
    info.authenticated = req.isAuthenticated();
    if(info.authenticated) {
      info.username = req.user.username;
    }
    res.json(info);
  });

  app.route('/api/userpolls').get((req, res) => {
    Users.findOne({ username: req.user.username }, (err, user) => {
      if(err) {
        console.log(err);
        return;
      }
      res.send(user.polls);
    });
  });

  app.route('/signup')
  .get(ensureNotAuthenticated, (req, res) => {
    res.sendFile(process.cwd() + '/views/html/sign-up.html');
  })
  .post((req, res, next) => {
    Users.findOne({ username: req.body.username }, (err, user) => {
      if(err) {
        next(err);
        return;
      }
      if(user) {
        res.redirect('/');
        return;
      }
      const newUser = new Users({
        username: req.body.username,
        password: req.body.password
      });
      newUser.save((err, saved) => {
        if(err) {
          res.redirect('/');
          return;
        }
        next(null, saved);
      });
    });
  }, passport.authenticate('local', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/');
  });

  app.route('/profile').get(ensureAuthenticated, (req, res) => {
    res.json({ message: "Welcome" + req.user.username });
  });

  app.route('/login')
  .get(ensureNotAuthenticated, (req, res) => {
    res.sendFile(process.cwd() + '/views/html/log-in.html');
  })
  .post(passport.authenticate('local', { failureRedirect: '/login' }), (req, res) => {
    res.redirect('/');
  });

  app.route('/logout').get((req, res) => {
    req.logout();
    res.redirect('/');
  });

  app.route('/mypolls').get(ensureAuthenticated, (req, res) => {
    res.sendFile(process.cwd() + '/views/html/mypolls.html');
  });

  app.route('/newpoll')
  .get(ensureAuthenticated, (req, res) => {
    res.sendFile(process.cwd() + '/views/html/newpoll.html');
  })
  .post(ensureAuthenticated, (req, res) => {
    let options = req.body.newoptions.split(',');
    var obj = {};
    for(let i = 0; i < options.length; i++) {
      obj[options[i]] = 0;
    }
    Users.findOne({ username: req.user.username }, (err, user) => {
      let newPoll = new Polls({
        author: req.user.username,
        question: req.body.question,
        options: obj,
        by: req.user.username
      });
      newPoll.save((err, saved) => {
        if(err) {
          console.log(err);
          return;
        }
      });
      user.polls.push(newPoll);
      user.markModified('polls');
      user.save((err, saved) => {
        if(err) {
          console.log(err);
          return;
        }
      });
    });
    res.redirect('/mypolls');
  });

  app.route('/delete/:id').get(ensureAuthenticated, (req, res) => {
    Users.findOne({ username: req.user.username }, (err, user) => {
      let id = new ObjectID(req.params.id);
      let pollToDelete = user.polls.id(id);
      if(!pollToDelete) {
        return;
      }
      pollToDelete.remove();
      user.save((err, saved) => {
        if(err) {
          console.log(err);
          return;
        }
      });
      Polls.findByIdAndRemove(id, (err, deleted) => {});
      res.redirect('/mypolls');
    });
  });

  app.route('/vote/:id').post((req, res) => {
    let id = new ObjectID(req.params.id);
    if(req.body.voted == 'Add Option') {
      Polls.findOne({ _id: id }, (err, poll) => {
        if(err) {
          console.log(err);
          return;
        }
        poll.options[req.body['new-option']] = 1;
        poll.markModified('options');
        poll.save((err, saved) => {
          if(err) {
            console.log(err);
            return;
          }
        });
        Users.findOne({ username: poll.author }, (err, user) => {
          if(err) {
            console.log(err);
            return;
          }
          let userPoll = user.polls.id(id);
          userPoll.options[req.body['new-option']] = 1;
          user.markModified('polls');
          user.save((err, saved) => {
            if(err) {
              console.log(err);
              return;
            }
          });
        });
      });
      res.redirect('/');
      return;
    }
    Polls.findOne({ _id: id }, (err, poll) => {
      if(err) {
        console.log(err);
        return;
      }
      poll.options[req.body.voted]++;
      poll.markModified('options');
      poll.save((err, saved) => {
        if(err) {
          console.log(err);
          return;
        }
      });
      Users.findOne({ username: poll.author }, (err, user) => {
        if(err) {
          console.log(err);
          return;
        }
        let userPoll = user.polls.id(id);
        userPoll.options[req.body.voted]++;
        user.markModified('polls');
        user.save((err, saved) => {
          if(err) {
            console.log(err);
            return;
          }
        });
      });
    });
    res.redirect('/');
  });
}