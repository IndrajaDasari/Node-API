import express from 'express';
import indexRouter from './mobile_routes/index';
import bodyParser from 'body-parser';
import compression from 'compression';
import { sendLogToSlack } from './slackAPI/slack';

const port = 4001;
const app = express();

app.use(compression({
  "level": 9
}));
// create application/json parser
app.use(bodyParser.json());
// create application/x-www-form-urlencoded parser
app.use(bodyParser.urlencoded({
  extended: true
}));

let allowCrossDomain = (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-type, authorization');
  next();
};
//to escape SSL verification
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

app.use(allowCrossDomain);


//routes
app.all('/*', indexRouter);
app.use( (err,req, res, next) => {
  sendLogToSlack(1,err,req,res)
 });

app.listen(port, function () {
});
export default app;