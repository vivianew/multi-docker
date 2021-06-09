const keys = require('./keys');

// express setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json()); // parse incoming requests


// connect to postgres
const { Pool } = require('pg');
const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort,
});


// initially create a table when connecting to PG

// PG gonna store the indices submitted
// we delay the table query after the connection is made

pgClient.on("connect", (client) => {
  client
    .query('CREATE TABLE IF NOT EXISTS values (number INT)')
    .catch(err => console.log(err))
});

// redis client setup

const redis = require('redis');
const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000,
});

const redisPublisher = redisClient.duplicate();

/*
if we have a client listening or publishing info on redis we have to make a duplicate connection
because a connection turned to listen or publish cannot be used for another purpose
 */

// express route handlers

app.get('/', (req, res) => {
  res.send('hi');
});

app.get('/values/all', async (req, res) => {
  const values = await pgClient.query('SELECT * from values');

  res.send(values.rows);
});

app.get('/values/current', (req, res) => {
  // look at a hash value from redis and get all the info from it
  redisClient.hgetall('values', (err, values) => {
    res.send(values);
  })
});

// redis for node does not have promise support so we need to use a callback


app.post('/values', async (req, res) => {
  const index = req.body.index;

  if (parseInt(index) > 40) {
    return res.status(422).send('Index too high');
  }

  redisClient.hset('values', index, 'Nothing yet!');

  redisPublisher.publish('insert', index);

  // pg db stores permanent record of indices
  pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);

  res.send({ working: true });
});

app.listen(5000, err => {
  console.log('listening');
})