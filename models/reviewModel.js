const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      trim: true,
      required: [true, 'Review can not be empty'],
    },
    rating: {
      type: Number,
      default: 4.5,
      min: 1,
      max: 5,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/** This will prevent duplicate reviews (a user post two reviews on the same tour) using INDEX */
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
  //   this.populate({
  //     path: 'tour',
  //     select: 'name',
  //   }).populate({
  //     path: 'user',
  //     select: 'name photo',
  //   });

  this.populate({
    path: 'user',
    select: 'name photo',
  });

  next();
});

/** We need a Static method because of the aggregate function */
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  // 'this' keyword points to the current model
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour', // group by tour
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  // console.log(stats);

  if (stats.legth > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

// This will add the ratings on 'save' (i.e when creating a new document)
reviewSchema.post('save', function () {
  // post middlewares do not get 'next'
  // this point to the current review
  // this.constructor points to the model who created the document
  this.constructor.calcAverageRatings(this.tour);
});

/** Review updated or deleted
 * Usually we use findByIdAndUpdate or findByIdAndDelete and for these we don't have document middleware but only
 * QUERY middleware. In query, we don't have direct access to the document in order to do something similar
 * to 'this.constructor.calcAverageRatings(this.tour);
 */
reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.findOne(); // this is going to retrieve the current document (and not the updated one) and we will get the tour id
  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  // await this.findOne(); does NOT work here, query has already executed
  if (this.r) {
    await this.r.constructor.calcAverageRatings(this.r.tour);
  }
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
