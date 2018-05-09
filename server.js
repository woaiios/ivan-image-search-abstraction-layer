
var express = require('express')
var app = express()
var mongodb = require('mongodb').MongoClient
var api_key = process.env.SECRET
var gsid = process.env.gsid
const axios = require('axios')
const dbUrl = process.env.dbUrl

app.use(express.static('public'));
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');  
});

app.get("/api/imagesearch/:id", function (req, res) {
  const keyWord = req.params.id
  const url = buildSearchURL(keyWord, req.query.offset)
  axios.get(url)
    .then(response => {
      var ret = []
      for(var i in response.data.items) {
         const item = response.data.items[i]
         var obj = {url:item.link,
                   snippet:item.snippet,
                   thumbnail:item.image.thumbnailLink,
                   context:item.image.contextLink}
        ret.push(obj)
      }
      res.send(JSON.stringify(ret))
      saveKeyWord(keyWord, function(obj) {
        
      })
    })
    .catch(error => {
      res.send("error")
      console.log(error)
    });
})

app.get("/api/latest/imagesearch/", function (req, res) {
  latestSearch(function(docs) {
    res.send(docs)
  })
})

var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});

function buildSearchURL(key_word, offset=0) {
  var ret = "https://www.googleapis.com/customsearch/v1?q="+key_word+
      "&cx="+gsid+"&key="+api_key+"&searchType=image"+"&safe=high"
  if (offset) {
    ret = ret + "&start=" + offset 
  }
  return ret
}

function saveKeyWord(key_word, finish) {
  mongodb.connect(dbUrl, function(err, db) {
      if (err) throw err;
      var dbo = db.db("ivan");
      dbo.createCollection("kws", function(err, res) {
        if (err) throw err;
        const date = new Date()
        var when = date.toISOString()
        const obj = {term: key_word, when: when}
          dbo.collection("kws").insertOne(obj, function(err, res) {
            if (err) throw err;
            db.close();
            finish(obj)
          })
      });
  })
}

function latestSearch(finish) {
  mongodb.connect(dbUrl, function(err, db) {
    if (err) throw err;
    const dbo = db.db("ivan")
    dbo.collection("kws").find({},{projection: {_id:0, term:1, when:1}}).sort({when:-1}).limit(10).toArray(function(err, docs) {
      if (err) throw err;
      db.close()
      finish(docs)
    })
  })
}
