require('dotenv').config();

const amqp = require('amqplib');

const messageQueueConnectionString = process.env.Rabbit_URL;

const setup = async () => {
  console.log("Setting up RabbitMQ Exchanges and Queues");
  const connection = await amqp.connect(messageQueueConnectionString);

  let channel = await connection.createChannel();

  await channel.assertExchange(process.env.Exchange, "direct", { durable: true });

  await channel.assertQueue(process.env.INCOME_QUEUE, { durable: true });
  await channel.assertQueue(process.env.OUTCOME_QUEUE, { durable: true });

  await channel.bindQueue(process.env.INCOME_QUEUE,process.env.Exchange, "request");
  await channel.bindQueue(process.env.OUTCOME_QUEUE,process.env.Exchange, "result");

  console.log("Setup DONE");
  process.exit();
}

setup();