const express = require('express')
const session = require("express-session")
const flash = require('connect-flash')
const MongoStore = require("connect-mongo")
const markdown = require('marked')
const csrf = require('csurf')
const app = express()


let sessionOptions = session({
  secret: "Javascript is sooooooo coool",
  store: MongoStore.create({client: require('./db')}),
  resave: false, 
  saveUninitialized: false, 
  cookie: {maxAge: 1000 * 60 * 60 * 24, httpOnly: true}
})

app.use(sessionOptions)
app.use(flash())

app.use(function(req,res, next) {
  // make markdown availble in ejs templates
  res.locals.filterUserHTML = function(content) {
    return markdown.parse(content)
  }
  // make flash messages avail for all templates
  res.locals.errors = req.flash("errors")
  res.locals.success = req.flash("success")
  
  // make user id available on req object
  if(req.session.user) {
    req.visitorId = req.session.user._id
  } else {
    {req.visitorId = 0}
  }
  res.locals.user = req.session.user
  next()
})

const router = require("./router")

app.use(express.urlencoded({extended: false}))
app.use(express.json())

app.use(express.static('public')) 
app.set("views",'views')
app.set('view engine', 'ejs')

app.use(csrf())

app.use(function (req, res, next) {
  res.locals.csrfToken = req.csrfToken()
  next()  
})

app.use('/', router)
app.use(function(err, req, res, next) {
  if(err) {
    if(err.code == "EBADCSRFTOKEN") {
      req.flash('errors', "Cross site request detected")
      req.session.save(() => {
        res.redirect("/")
      })
    } else {
      res.render('404')
    }
  }
})



module.exports = app