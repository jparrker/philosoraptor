const bcrypt = require("bcryptjs")
const validator = require('validator')
const md5 = require('md5')
const usersCollection = require("../db").db().collection("users")


let User = function(data, getAvatar) {
  this.data = data
  this.errors = []
  // if (getAvatar == undefined) {
  //   getAvatar = false
  if(getAvatar) {this.getAvatar()}
  } 
  



User.prototype.cleanUp = function() {
  if(typeof(this.data.username) != 'string') {
    this.data.username = ""
  }
  if(typeof(this.data.email) != 'string') {
    this.data.email = ""
  }
  if(typeof(this.data.password) != 'string') {
    this.data.password = ""
  }

  // get rid of any bogus properties
  this.data = {
    username: this.data.username.trim().toLowerCase(),
    email: this.data.email.trim().toLowerCase(),
    password: this.data.password
  }

}

User.prototype.validate = function() {
  return new Promise(async (resolve, reject) => {
    if (this.data.username == '') {this.errors.push("You must provide a username.")}
    if (this.data.username != "" && !validator.isAlphanumeric(this.data.username)) {this.errors.push('user name can only contain letters and numbers')}
    if (!validator.isEmail(this.data.email)) {this.errors.push("You must provide a valid email.")}
    if (this.data.password == '') {this.errors.push("You must provide a password.")}
    if (this.data.password.length > 0 && this.data.password.length < 12) {this.errors.push('Password must be at least 12 chars')}
    if (this.data.password.length > 50) {this.errors.push("Password cannot exceed 50 chars")}
    if (this.data.username.length > 0 && this.data.password.length < 3) {this.errors.push('Username must be at least 3 chars')}
    if (this.data.username.length > 30) {this.errors.push("Username cannot exceed 30 chars")}
    
    // Only if user name is valid, check if taken.
    if (this.data.username.length > 2 && this.data.username.length < 31 && validator.isAlphanumeric(this.data.username)) {
      let usernameExists = await usersCollection.findOne({username: this.data.username})
      if (usernameExists) {
        this.errors.push("That user name is taken")
      }
    }
    // Check email
    if (validator.isEmail(this.data.email)) {
      let emailExists = await usersCollection.findOne({email: this.data.email})
      if (emailExists) {
        this.errors.push("That email is being used")
      }
    }
    resolve()
  })
}



User.prototype.login = function() {
  return new Promise((resolve, reject) => {
    this.cleanUp()
  usersCollection.findOne({username: this.data.username} ).then((attemptedUser) => {
    if (attemptedUser && bcrypt.compareSync(this.data.password, attemptedUser.password)) {
      this.data = attemptedUser
      this.getAvatar()
      resolve("congrats!")
    } else {
        reject('invalid user name / password')
    }
  }).catch(function() {
    reject("Please try again later.")
  })

  })
}


User.prototype.register = function() {
  return new Promise(async(resolve, reject) => {
    this.cleanUp()
    await this.validate()
    
    if (!this.errors.length) {
      let salt = bcrypt.genSaltSync(10)
      this.data.password = bcrypt.hashSync(this.data.password, salt)
      await usersCollection.insertOne(this.data)
      this.getAvatar()
      resolve()
    } else {
      reject(this.errors)
    }
    
  })
}

User.prototype.getAvatar = function() {
  this.avatar = `http://gravatar.com/avatar/${md5(this.data.email)}?s=128`
}

User.findByUsername = function (username) {
  return new Promise(function (resolve, reject) {
    if (typeof(username) != "string") {
      reject()
      return
    }
    usersCollection.findOne({username: username}).then(function (userDoc) {
      if(userDoc) {
        userDoc = new User(userDoc, true)
        userDoc = {
          _id: userDoc.data._id,
          username: userDoc.data.username,
          avatar: userDoc.avatar
        }
        resolve(userDoc)
      } else {
        reject()
      }
    }).catch(function () {
      reject()
    })
  })
}

module.exports = User 