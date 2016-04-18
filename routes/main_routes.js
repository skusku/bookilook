"use strict";

var User = require("../models/users.js");
var Nonce = require("../models/nonces.js");
var EmailVerification = require("../modules/emailverification.js");

module.exports = function (app, passport) {

  app.get("/activate/:code", function (req, res, next) {
    var hash = req.params.code;
    User.findOneAndUpdate({ "local.verificationHash": hash }, { $unset: { "local.createdAt": 1, "local.verificationHash": 1 }, $set: { "local.verified": true } }, { new: true }, function (err, user) {
      if (!user) {
        res.redirect("/");
      }
      req.login(user, function (err) {
        if (err) return next(err);
        res.redirect("/");
      });
      res.end();
    });
  });

  app.post("/updateAccount", isLoggedIn, function (req, res, next) {
    User.findById(req.user._id, function (err, user) {
      if (req.body.email && req.body.email.match(/\w*@\w*.\w*/) == null) return res.send({ code: 11 });

      if (user.validPassword(req.body.currentpassword)) {
        user.local.username = req.body.username ? req.body.username : user.local.username;
        user.local.USERNAME = req.body.username ? req.body.username.toUpperCase() : user.local.USERNAME;

        user.local.email = req.body.email && req.body.email.match(/\w*@\w*.\w*/) ? req.body.email : user.local.email;
        user.local.EMAIL = req.body.email && req.body.email.match(/\w*@\w*.\w*/) ? req.body.email.toUpperCase() : user.local.EMAIL;

        user.local.password = req.body.newpassword ? user.generateHash(req.body.newpassword) : req.user.local.password;

        user.save(function (err) {
          if (err) return next(err);
          return res.send({ code: 0 });
        });
      } else {
        return res.send({ code: 10 });
      }
    });
  });

  app.get("/", function (req, res) {
    if (req.isAuthenticated()) {
      res.render("index", { data: { authed: true, email: req.user.local.email, username: req.user.local.username } });
    } else res.render("index", { data: { authed: false, email: "" } });
  });

  app.get("/login", function (req, res) {
    res.render("index");
  });

  app.get("/profile", isLoggedIn, function (req, res) {
    res.render("index");
  });

  app.post("/logout", function (req, res) {
    req.logout();
    req.session.destroy();

    res.redirect("/");
  });

  app.get("/signup", function (req, res) {
    res.render("index");
  });

  app.post("/signup", function (req, res, next) {
    passport.authenticate("local-signup", function (err, user, info) {
      if (err) return next(err);
      switch (info.code) {
        case 10:
          res.end("This email address already exists in our database.");
          break;
        case 11:
          res.end("Please provide a real existing e-mail address.");
          break;
        case 0:
          res.end("Registration successful. Please check your inbox for a verification email!");
          break;
      }
    })(req, res, next);
  });

  app.post("/getnonce", function (req, res, next) {
    Nonce.findOne({ userID: req.sessionID }, function (err, nonce) {
      if (nonce) {
        nonce.nonce = nonce.generateNonce(req.sessionID);
      } else {
        nonce = new Nonce();
        nonce.userID = req.sessionID;
        nonce.nonce = nonce.generateNonce(req.sessionID);
      }

      nonce.save(function (err) {
        if (err) return next(err);
        res.end(nonce.nonce);
      });
    });
  });

  app.post("/login", function (req, res, next) {
    passport.authenticate("local-login", function (err, user, info) {
      if (err) return next(err);
      if (info.code == 10 || info.code == 11) res.send({ user: null, message: "Wrong password / login combination" });
      if (info.code == 12) res.send({ user: null, message: "Please verify your email address before continuing" });
      if (info.code == 0) {
        req.login(user, function (err) {
          if (err) return next(err);
        });
        res.send({ user: user, message: "Logged in successfully!" });
      }
    })(req, res, next);
  });

  app.post("/checkAuth", function (req, res) {
    if (req.isAuthenticated()) {
      User.findById(req.user._id, function (err, user) {
        res.send({ authed: true, user: { username: user.local.username, email: user.local.email } });
      });
    } else res.send({ authed: false });
  });
};

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  res.redirect("/");
}