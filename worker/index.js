/*
- connect to redis
- watch for values
- calculate fibonacci values
 */

// CONNECTION KEYS
const keys = require('./keys');

const redis = require('redis');

const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000,
});

/*
  MAKE A DUPLICATE
 */
const sub = redisClient.duplicate();

/*
fibonacci - slow recursive solution here: to simulate the worker process
 */

function fib(index) {
  if (index < 2) return 1;
  return fib(index-1) + fib(index-2);
}

/*
watch values

anytime we get a new value in redis, we calc a new fibonacci value
insert that into a hash of values, key will be index / the message and we push the new value


 */

sub.on('message', (channel, message) => {
  redisClient.hset('values', message, fib(parseInt(message)));
});

sub.subscribe('insert')