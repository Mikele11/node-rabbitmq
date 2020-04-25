require('dotenv').config();

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const amqp = require('amqplib');

app.use(bodyParser.json());

// ids
let lastRequestId = 1;

const messageQueueConnectionString = process.env.Rabbit_URL;

  let channel;
  let connection; 
  (async()=> {
    connection = await amqp.connect(messageQueueConnectionString);
    channel = await connection.createConfirmChannel();
  })()


app.post('/api/send', async function (req, res) {
  // ids
  let requestId = lastRequestId;
  lastRequestId++;

  let requestData = req.body.data;
  console.log("Published a request message, requestId:", requestId);

  await publishToChannel(channel, { routingKey: "request", exchangeName: process.env.Exchange, data: { requestId, requestData } });

  res.send({ requestId });
});

app.get('/delete-all', async(req, res) => {

  await channel.purgeQueue(process.env.OUTCOME_QUEUE)
  res.send({ success: true })

});

function publishToChannel(channel, { routingKey, exchangeName, data }) {
  return new Promise((resolve, reject) => {
    channel.publish(exchangeName, routingKey, Buffer.from(JSON.stringify(data), 'utf-8'), { persistent: true, deliveryMode: 2 }, (err, ok) => {
      if (err) {
        return reject(err);
      }

      resolve();
    })
  });
}

async function listenForResults() {
  let connection = await amqp.connect(messageQueueConnectionString);

  let channel = await connection.createChannel();
  await channel.prefetch(1);

  await consume({ connection, channel });
}


function consume({ connection, channel, resultsChannel }) {
  return new Promise((resolve, reject) => {
    channel.consume(process.env.OUTCOME_QUEUE, async (msg) => {

      const msgBody = msg.content.toString();
      const data = JSON.parse(msgBody);
      const { requestId,processingResults } = data
      console.log("Received a result message, requestId:", requestId, "processingResults:", processingResults);

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

const PORT = 3000;
app.listen(PORT, () => { console.info("Listening on port ", PORT); });

listenForResults();