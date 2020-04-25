require('dotenv').config();

const amqp = require('amqplib');

const messageQueueConnectionString = process.env.Rabbit_URL;

async function listenForMessages() {
  let connection = await amqp.connect(messageQueueConnectionString);

  let channel = await connection.createChannel();
  await channel.prefetch(1);

  let resultsChannel = await connection.createConfirmChannel();

  await consume({ connection, channel, resultsChannel });
}

function publishToChannel(channel, { routingKey, exchangeName, data }) {
  return new Promise((resolve, reject) => {
    channel.publish(exchangeName, routingKey, Buffer.from(JSON.stringify(data), 'utf-8'), { persistent: true, deliveryMode: 2 }, function (err, ok) {
      if (err) {
        return reject(err);
      }

      resolve();
    })
  });
}

function consume({ connection, channel, resultsChannel }) {
  return new Promise((resolve, reject) => {
    channel.consume(process.env.INCOME_QUEUE, async function (msg) {

      const msgBody = msg.content.toString();
      const data = JSON.parse(msgBody);
      const { requestId,requestData } = data

      console.log("Received a request message, requestId:", requestId);

      
      let processingResults = await processMessage(requestData);

      await publishToChannel(resultsChannel, {
        exchangeName: process.env.Exchange,
        routingKey: "result",
        data: { requestId, processingResults }
      });
      console.log("Published results for requestId:", requestId);

      await channel.ack(msg);
    });

    connection.on("close", (err) => {
      return reject(err);
    });

    connection.on("error", (err) => {
      return reject(err);
    });
  });
}

function processMessage(requestData) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(requestData + "  :: <= new message")
    }, 5000);
  });
}

listenForMessages();