import express from 'express';
import dotenv from 'dotenv';
import './bot/telegramBot';


dotenv.config();
const app = express();
const port = process.env.PORT

app.get('/', (_req, res) => {
  res.send('Rental AI Agent is running');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  
});

const test: string = 'testing';
