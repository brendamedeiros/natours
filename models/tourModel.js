const mongoose = require('mongoose');
const slugify = require('slugify');
const User = require('./userModel');
// const validator = require('validator');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, 'A tour name must have less or equal than 40 characters'],
      minlength: [10, 'A tour name must have more or equal than 10 characters'],
      // validate: [validator.isAlpha, 'Tour name must only contain characters'],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either easy, medium or difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      set: (val) => Math.round(val * 10) / 10, // 4.666666, 4.6666, 47, 4.7
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          // this only points to current doc on NEW document creation
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) should be below regular price',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a description'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have an cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      // GeoJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId, //expecting a MongoDB ID for child referencing
        ref: 'User', //it doesn't need to import the model
      },
    ],
  },
  {
    // If we have a virtual property (a field that isn't stored in the DB), we want it to show on output
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/** Index: 1 means sorting the field in asc and -1 in desc */
// tourSchema.index({ price: 1 }); //when commenting this line, make sure to also delete this on DB
tourSchema.index({ price: 1, ratingsAverage: -1 }); // compound index
tourSchema.index({ slug: 1 });

//for geospacial index, the value need to be a 2D sphere index if the data describes real points on the Earth like sphere
tourSchema.index({ startLocation: '2dsphere' });

// Virtual Properties: Fields that we can define on our schema but that will not be persisted. Eg. fields that can be derived from one another
// The 'durationWeeks' will not work on Tours.find because it's not really part of the DB.
tourSchema.virtual('durationWeeks').get(function () {
  // using function() because the arrow function doesn't get its own 'this' keyword and here it will be pointing to the current document
  return this.duration / 7;
}); // get(): will be created each time that we get some data out of the DB

// Virtual Populate
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour', // this is the name of the field in the other model (Review) where the ref to the current model is stored
  localField: '_id', //current model. We need to say where that ID is actually stored here in this current Tour model
});

/*  - Mongoose middleware is also called pre and post hooks because function can be defined to run before or after a certain event
    - We can have multiple pre or post middlewares for the same hook
    - 4 types of middleware: document, query, aggregate and model middleware
*/

// DOCUMENT MIDDLEWARE: runs before .save() and .create() but not on .insertMany, .findByIdAndUpdate
tourSchema.pre('save', function (next) {
  // console.log(this); // 'this' refers to the current processed document
  this.slug = slugify(this.name, { lower: true });
  next();
});

// Responsible for embedding
// tourSchema.pre('save', async function (next) {
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id));

//   // We need to use Promise.all here because the guidesPromises will return an array full of Promises
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

// tourSchema.pre('save', function (next) {
//   console.log('Will save document...');
//   next();
// });

// tourSchema.post('save', function (doc, next) {
//   console.log(doc);
//   next();
// });

// QUERY MIDDLEWARE - 'this' will point to the current query
// the regular expression for 'find' will return for both find and findOne, findOneAndRemove
// tourSchema.pre('find', function (next) {
tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } });

  this.start = Date.now();
  next();
});

tourSchema.post(/^find/, function (docs, next) {
  console.log(`Query took ${Date.now() - this.start} milliseconds`);
  next();
});

tourSchema.pre(/^find/, function (next) {
  // With 'populate' we are going to fill the field 'guides' up with the actual data, only in the query and NOT IN the actual DB
  // Using 'populate' we are also creating a new query, so keep that in mind for performance matters

  this.populate({
    path: 'guides', // the field that will be populated from object ID
    select: '-__v -passwordChangedAt', //getting rid of these fields on output
  });
  next();
});

// AGGREGATION MIDDLEWARE allows us to add hooks before or after an aggregation happens
// tourSchema.pre('aggregate', function (next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });

//   console.log(this.pipeline());
//   next();
// });

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
