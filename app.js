var express = require('express'),
	path = require('path'),
	fs = require('fs'),
	compression = require('compression'),
	logger = require('morgan'),
	timeout = require('connect-timeout'),
	methodOverride = require('method-override'),
	responseTime = require('response-time'),
	favicon = require('serve-favicon'),
	serveIndex = require('serve-index'),
	vhost = require('vhost'),
	busboy = require('connect-busboy'),
	errorhandler = require('errorhandler');

var app = express();
var list = [];
var bodyParser = require('body-parser')
app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
	extended: true
}));

app.set('view cache', true);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.set('port', process.env.PORT || 3000);
app.use(compression({ threshold: 1 }));
// Standard Apache combined log output.
app.use(logger('combined'));
// :remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length]
app.use(methodOverride('_method'));
app.use(responseTime(4));
app.use('/shared', serveIndex(
	path.join('public', 'shared'), { 'icons': true }
));
app.use(express.static('public'));

app.use('/upload', busboy({ immediate: true }));
app.use('/upload', function(request, response) {
	request.busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
		file.on('data', function(data) {
			fs.writeFile('upload' + fieldname + filename, data);
		});
		file.on('end', function() {
			console.log('File ' + filename + ' is ended');
		});

	});
	request.busboy.on('finish', function() {
		console.log('Busboy is finished');
		response.status(201).end();
	})
});

app.get(
	'/slow-request',
	timeout('1s'),
	function(request, response, next) {
		setTimeout(function() {
			if (request.timedout) return false;
			return next();
		}, 999 + Math.round(Math.random()));
	},
	function(request, response, next) {
		response.send('ok');
	}
);

app.delete('/purchase-orders', function(request, response) {
	console.log('The DELETE route has been triggered');
	response.status(204).end();
});

app.get('/response-time', function(request, response) {
	setTimeout(function() {
		response.status(200).end();
	}, 513);
});

app.get('/', function(request, response) {
	    response.sendFile(path.join(__dirname+'/index.html'));
});
app.get('/compression', function(request, response) {
	response.render('index');
})
app.use(errorhandler());
var server = app.listen(app.get('port'), function() {
	console.log('Express server listening on port ' + server.address().port);
});

app.post('/add', function(request, response) {
	var item = request.body.name
	list.push(item)
	response.setHeader('content-type', 'application/json')
	response.send({ message: 'added ' + item + " to the list" });
	response.status(200).end();
});

app.get('/list', function(request, response) {
	response.send('List:' + list);
	response.status(200).end();
});

app.post('/del', function(request, response) {
	var item = request.body.name
	if(list.includes(item)){
list.splice( list.indexOf(item), 1 );
	response.send({ message: 'deleted ' + item + " from the list" });
	response.status(200).end();
}
	else{
			response.send({ message: 'No item with name ' + item + " found" });
	response.status(200).end();
	}
});

app.post('/filter', function(request, response) {
	var letter = request.body.letter
	var tempList = []
	list.forEach(function(item) {
		if (item.charAt(0) === letter) {
			tempList.push(item)
			console.log("added " + item)
			console.log("l " + tempList)
		}
	})
	response.setHeader('content-type', 'application/json')
	response.send({ message: 'Items starting with the letter ' + letter + ": " + tempList });
	response.status(200).end();
});

app.post('/clear', function(request, response) {
	list = []
	response.setHeader('content-type', 'application/json')
	response.send({ message: 'deleted everything from the list' });
	response.status(200).end();
});
