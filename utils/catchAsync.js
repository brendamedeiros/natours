/** In order to get rid of the try/catch blocks, we simply wrap our async function inside of the catchAsync function
 * This function will then return a new annonymous function which will then be assigned to, for instance, createTour()
 */
module.exports = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => next(err)); // it's the same as writing .catch(next)
  };
};
