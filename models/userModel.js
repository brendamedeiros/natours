const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A user must have a name'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'A user must have an email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'A user must have a password'],
    minlength: 8,
    select: false, // it will never show on output
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      // This only works on CREATE and SAVE!!!
      validator: function (el) {
        return el === this.password;
      },
      message: 'Passwords are not the same!',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

// /** 'save' is being used here because the middleware function for encryption is going to happen
//  * between the moment that we receive that data and the moment where it's actually persisted to the database. Perfect time to manipulate the data */
userSchema.pre('save', async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) {
    return next();
  }

  /** Bcrypt(string, cost param)
   * 1) Automatically generating the salt (random string that is gonna be added to the password) and then use that salt in this hash function
   * 2) Or simply pass a cost param to the function, which is a measure of how CPU intensive this operation will be (default it's 10).
   * We are using 12 because the more CPU intensive the process will be then the better the password will be encrypted
   *
   * hash() is the async version and return a promise
   */
  this.password = await bcrypt.hash(this.password, 12);

  /** Delete a field so it won't be persisted in the DB
   * We only need the password confirm for the validation that was implement before on userSchema, just making sure the user inputed two equal passwords.
   */
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  /** Sometimes, saving to the DB is a bit slower that issuing the JWT, making it so that the
   * changed password ts is sometimes set a bit after the JWT is created (i.e the user won't be
   * able to log in using the new token
   * This will put this.passwordChangedAt one second in the past will then ensure that the token is always created
   * after the password has been changed */
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function (next) {
  // this point to the current query
  this.find({ active: { $ne: false } });
  next();
});

/** Instance method is a method that is going to be available on all documents of a certain collection */
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  // this.password won't be available because of the 'select: false' on the output so we are using the arguments to compare
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimestamp < changedTimestamp;
  }

  // False means NOT changed
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex'); // this token is what we are going to send to the user

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  console.log({ resetToken }, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
