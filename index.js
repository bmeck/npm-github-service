var fs=require( "fs" )
var path=require( "path" )
var http=require( "http" )

function start() {
	process.chdir( "./repos" )
	http.createServer(
		require( "./src/PostRecieveHook" )
	).listen( 11011 )
}

path.exists( "./repos", function( exists ) {
	if( !exists ) {
		fs.mkdir( "./repos", start )
	}
	else {
		start()
	}
} )