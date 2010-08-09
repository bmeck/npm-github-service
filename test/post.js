var fs = require( "fs" )
var http = require( "http" )

var server = require("./../index")
setTimeout(function(){
	var client = http.createClient( 8888, "127.0.0.1", true )
	console.log("STARTING TEST")
	var request = client.request("post","/",{"host":"127.0.0.1"})

	fs.readFile( "../push.json", function( err, data ) {
		if(err) throw err
		request.end( data )
	} )
},1000)