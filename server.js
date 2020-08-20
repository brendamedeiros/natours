const mongoose = require('mongoose');

const dotenv = require('dotenv');

process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION..shutting down');
  console.log(err.name, err.message);

  /** After there was an uncaught exception, the entire node process is in a so-called 'unclean' state
   * To fix that, the process needs to terminate and then to be restarted
   */
  process.exit(1); //0: success 1: uncaught exception
});

dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose.set('useUnifiedTopology', true);

mongoose
  // .connect(process.env.DATABASE_LOCAL, {
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })

  .then(() => console.log('DB connection successful'));
// .catch((err) => console.log('ERROR'));
const app = require('./app');

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION..shutting down');
  console.log(err.name, err.message);

  /** SHUT DOWN 'GRACEFULLY': first close the server and only then we shut down the application
   * in production we should use some tool that restarts the application right after it crashes
   */
  server.close(() => {
    process.exit(1); //0: success 1: uncaught exception
  });
});
