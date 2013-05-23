var express = require('express'),
  app = express(),
  mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var server = app.listen(process.env.PORT || 5000);
mongoose.connect(process.env.MONGOHQ_URL || 'mongodb://localhost/dreams');

// defining mongoose schemas
var dreamSchema = new Schema({
  dream: String,
  pseudo: String,
  sex: String,
  visible: {type: Boolean, default: false},
  yes: {type: Number, default: 0},
  no: {type: Number, default: 0},
  nice: {type: Number, default: 0},
  boring: {type: Number, default: 0},
  comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }]
});

var commentSchema = new Schema({
  author: String,
  message: String
});

// creating the models
var Dream   = mongoose.model('Dream', dreamSchema);
var Comment = mongoose.model('Comment', commentSchema);

app.use(express.bodyParser());
app.engine('.html', require('jade').__express);

function serializeDream(dream) {
  return {
    dream: dream.dream,
    pseudo: dream.pseudo,
    sex: dream.sex,
    id: dream._id,
    yes: dream.yes,
    no: dream.no,
    visible: dream.visible,
    nice: dream.nice,
    boring: dream.boring,
    comment_ids: dream.comments
  };
}

app.get('/moderate', express.basicAuth('flo', 'rambo'), function(req, res) {
  Dream.find({ "$where": "this.yes > this.no && !this.visible" }, function(err, dreams) {
    res.render("moderate.jade", {
      dreams: dreams
    });
  });
});

app.get('/moderate/:dream_id/visible', express.basicAuth('flo', 'rambo'), function(req, res) {
  Dream.findById(req.params.dream_id, function(err, dream) {
    dream.visible = true;
    dream.save(function() {
      res.redirect('/moderate');
    });
  });
});

app.get('/moderate/:dream_id/remove', express.basicAuth('flo', 'rambo'), function(req, res) {
  Dream.findById(req.params.dream_id).remove(function() {
    res.redirect('/moderate');
  });
});

app.get('/dreams', function(req, res) {
  var query = Dream.find(req.query).sort( {_id: -1} ).exec();
  res.set({ 'Content-Type': 'application/json' });

  query.then(function(dreams) {
    var resDreams = [];

    dreams.forEach(function(dream) {
      resDreams.push(serializeDream(dream));
    });

    res.send(JSON.stringify({
      dreams: resDreams
    }));
  });
});

app.post('/dreams', function(req, res) {
  console.log(req.body);
  var dream = new Dream({
    dream: req.body.dream.dream,
    pseudo: req.body.dream.pseudo,
    sex: req.body.dream.sex
  });

  dream.save(function(err, d) {
    res.writeHead(201);
    res.end();
  });
});

app.put('/dreams/:dreamId', function(req, res) {
  Dream.findById(req.params.dreamId, function(err, dream) {
    if (err) return;

    dream.yes = req.body.dream.yes;
    dream.no = req.body.dream.no;
    dream.nice = req.body.dream.nice;
    dream.boring = req.body.dream.boring;

    dream.save(function() {
      res.send(JSON.stringify(serializeDream(dream)));
    });
  });
});

app.get('/dreams/:dreamId', function(req, res) {
  var dreamId = req.params.dreamId;
  Dream.findById(dreamId, function(err, dream) {
    if (err || !dream) {
      res.status(404).send('Not found');
    } else {
      res.send(JSON.stringify({
        dream: serializeDream(dream)
      }));
    }
  });
});

app.post('/comments', function(req, res) {
  var comment = new Comment({
    author: req.body.comment.author,
    message: req.body.comment.message
  });

  comment.save(function(err, c) {
    Dream.findById(req.body.comment.dream_id, function(err, d) {
      d.comments.push(c);
      d.save(function(){
        res.send(JSON.stringify({
          comment: {
            id: comment._id,
            author: comment.author,
            message: comment.message
          }
       }));
      });
    });
  });
});

app.get('/comments', function(req, res) {
  function serializeComment(comment) {
    return {
      id: comment.id,
      author: comment.author,
      message: comment.message
    };
  }

  var ids = req.query.ids;
  Comment
  .find({ _id: { $in: ids }}, function(err, comments){
    var answer = [];
    comments.forEach(function(comment) {
      answer.push(serializeComment(comment));
    });
    res.send(JSON.stringify({
      comments: answer
    }));
  });
});

app.use(express.static(__dirname + '/public'));