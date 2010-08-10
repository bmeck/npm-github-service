var fs=require( "fs" )
var path=require( "path" )
var http=require( "http" )

var port = 8888
function start() {
	process.chdir( "./repos" )
	var server = http.createServer(
		function() {
			console.log("REQUEST!")
			require( "./src/PostRecieveHook" ).apply(this,arguments)
		}
	)
	server.on("connection",function(){console.log("@CONNECTION EVENT")})
	server.listen( port, "127.0.0.1" )
	console.log("SERVER STARTED ON PORT "+port)
}

path.exists( "./repos", function( exists ) {
	if( !exists ) {
		fs.mkdirSync( "repos", "666", start )
	}
	start()
} )
