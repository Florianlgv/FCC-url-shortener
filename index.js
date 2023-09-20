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
        const newCounter = new Counter({_id: 'urlCount', count: 0});
        newCounter.save();
    }
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.post('/api/shorturl', async (req, res) => {
  const originalUrl = req.body.url;
  const urlObject = new URL(originalUrl);

  try {
    await dns.promises.lookup(urlObject.hostname);

    const counter = await Counter.findOneAndUpdate({_id: 'urlCount'}, {$inc: {count: 1}}, {new: true, upsert: true});
    const shortUrl = counter.count;

    const urlEntry = new UrlModel({
        original_url: originalUrl,
        short_url: shortUrl
    });

    await urlEntry.save();

    res.json({
        "original_url": originalUrl,
        "short_url": shortUrl
    });
  } catch (err) {
    if (err.code === 'ENOTFOUND') {
      res.status(400).json({ error: 'Invalid URL' });
    } else {
      res.status(500).json({ error: 'Server error' });
    }
  }
});

app.get('/api/shorturl/:shortId', (req, res) => {
    UrlModel.findOne({ short_url: req.params.shortId }, (err, data) => {
        if (err || !data) {
            return res.status(404).json({ error: 'URL not found' });
        }
        res.redirect(data.original_url);
    });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
