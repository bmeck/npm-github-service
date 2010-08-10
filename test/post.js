var fs = require( "fs" )
var http = require( "http" )

var server = require("./../index")
setTimeout(function(){
	var client = http.createClient( 8888, "127.0.0.1" )
	console.log("STARTING TEST")
	var request = client.request("POST","/",{"host":"127.0.0.1","accept":"*/*"})
	request.on("response",function(){
		console.log("response to client")
	})
	fs.readFile( "../push.json", function( err, data ) {
		if(err) throw err
		request.write( data )
		request.end( )
		console.log("request sent")
	} )
},1000)
