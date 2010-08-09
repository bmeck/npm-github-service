var fs = require( "fs" )
var http = require( "http" )

var server = require("./../index")
var client = http.createClient( 11011, "127.0.0.1", true )

var request = client.request("POST","/")

fs.readFile( "./push.json", function( data ) {
	request.end()
} )
