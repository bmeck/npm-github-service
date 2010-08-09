var fs=require( "fs" )
var path=require( "path" )
var http=require( "http" )

var port = 8888
function start() {
	process.chdir( "./repos" )
	http.createServer(
		function() {
			console.log("REQUEST!")
			require( "./src/PostRecieveHook" ).apply(this,arguments)
		}
	).listen( port )
	console.log("SERVER STARTED ON PORT "+port)
}

path.exists( "./repos", function( exists ) {
	if( !exists ) {
		fs.mkdirSync( "repos", "666", start )
	}
	start()
} )