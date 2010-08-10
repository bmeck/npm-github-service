var fs=require( "fs" )
var path=require( "path" )
var http=require( "http" )

var port = 8888
function start() {
	process.chdir( "./repos" )
	var server = http.createServer(
		require( "./src/PostRecieveHook" )
	)
	server.listen( port )
	console.log("SERVER STARTED ON PORT "+port)
}

path.exists( "./repos", function( exists ) {
	if( !exists ) {
		fs.mkdirSync( "repos", "666", start )
	}
	start()
} )
