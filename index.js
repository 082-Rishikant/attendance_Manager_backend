const express = require("express");
const cors = require("cors");
const connectToMongo =require('./db');

// First Connect to the database
connectToMongo();

const app = express();
require('dotenv').config();
const port=process.env.PORT;

app.use(cors());
app.use(express.json());

app.get('/favicon.ico', (req, res) => res.status(204));

// all Routers are here
app.use('/api/auth', require('./routes/auth'));
app.use('/api/file', require('./routes/Files'));

app.listen(port, () => {
  console.log(`App is listening on port ${port}`);
});