const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');
const dns = require('dns');
// Connect to MongoDB
mongoose.connect(process.env['MONGO_URI'], {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log("Connected to MongoDB");
})
.catch(err => {
    console.error("Error connecting to MongoDB", err);
});

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use('/public', express.static(`${process.cwd()}/public`));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

let urlSchema = new mongoose.Schema({
  original_url : String,
  short_url : String,
});
const UrlModel = mongoose.model('UrlModel', urlSchema);

let counterSchema = new mongoose.Schema({
    _id: {type: String, required: true},
    count: { type: Number, default: 0 }
});
const Counter = mongoose.model('Counter', counterSchema);

Counter.findOne({_id: 'urlCount'}).then(counter => {
    if(!counter){
        const newCounter = new Counter({_id: 'urlCount'});
        newCounter.save();
    }
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.post('/api/shorturl', async (req, res) => {
  
  const originalUrl = req.body.url;
  try {
  const urlObject = new URL(originalUrl);
  
    await dns.promises.lookup(urlObject.hostname);

    Counter.findOneAndUpdate({_id: 'urlCount'}, {$inc: {count: 1}}, {new: true, upsert: true})
      .then((counter) => {
        const shortUrl = counter.count;
        const urlEntry = new UrlModel({
        original_url: originalUrl,
        short_url: shortUrl
        });
        urlEntry.save();
        res.json({
        "original_url": originalUrl,
        "short_url": shortUrl
        });
      });
  } catch (err) {
      res.json({ error: 'invalid url' });
    }
});
         
app.get('/api/shorturl/:shortId', (req, res) => {
    UrlModel.findOne({ short_url: req.params.shortId })
      .then((data) => {
        res.redirect(data.original_url);
      })
      .catch((err) => {
        return res.status(404).json({ error: 'invalid url' });
      })
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});

