var express = require('express'),
  app = express();

var server = app.listen(process.env.PORT, function() {
  console.log('Listening on', process.env.PORT);
});

app.get('/posts', function(req, res) {
  res.set({ 'Content-Type': 'application/json' });
  var result = [{
    id: 1,
    dream: 'Staive dream',
    pseudo: 'Cousin',
    sex: 'Male'
  }, {
    id: 2,
    dream: 'yo mama',
    pseudo: 'machin',
    sex: 'Male'
  }, {
    id: 3,
    dream: 'waiiiishe',
    pseudo: 'georges',
    sex: 'Female'
  }];
  res.send(JSON.stringify(result));
});
