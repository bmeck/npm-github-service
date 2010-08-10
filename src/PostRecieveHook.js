var http = require("http")
var fs = require( "fs" )
var path = require( "path" )
var sys = require( "sys" )
var exec = function() {
	require("child_process").exec.apply(this,arguments)
}

function GetPackageJSON(push,cb) {
	path.exists(path.join(push.repository.name,"package.json"),function(exists) {
		if(exists) {
			fs.readFile(path.join(push.repository.name,"package.json"),function(err,data){
				if(err) throw err
				cb(JSON.parse(data))
			})
		}
		else {
			cb({
				name:push.repository.name
				,description:push.repository.description
				,
			})
		}
	})
}

//maintains a list of tags to process
var todos = {/*repo:{tag:'',commit:'',package.json:{...}}*/}
var working_on = {/*repo:true|false*/}

function GetTags(push,cb) {
	//get a new socket client
	var github_http=http.createClient(80,"github.com")
	var request = github_http.request(
		"GET"
		,"http://github.com/api/v2/json/repos/show/"+push.repository.owner.name+"/"+push.repository.name+"/tags"
		,{host:"github.com"}
	)
	request.on("response",function(response){
		console.log("REPSONSE GOTTEN")
		var buffer=""
		response.on("data",function(data){
			buffer+=data
		})
		response.on("end",function(end){
			cb(JSON.parse(buffer).tags)
		})
	})
	request.write("")
	request.end("")
}

function ProcessCommits(name,todos) {
	if(!todos.length) {
		working_on[name] = false
		return
	}
	update=todos.shift()
	update.pkg.version=update.tag
	PublishVersion(name,update,todos)
}

function Upload(name,update,todos) {
	console.log("UPLOADING")
	fs.writeFile(path.join(name,"package.json"),JSON.stringify(update.pkg),function(err) {
		if(err) throw err
		exec("git --git-dir="+name+"/.git --work-tree=./ checkout "+update.commit,function(error){
			exec("npm publish "+name,function(error){
				if(error) throw error
				ProcessCommits(name,todos)
			})
		})
	})
}

function PublishVersion(name,update,todos) {
	var npm_http = http.createClient(80,"registry.npmjs.org")
	var request = npm_http.request("GET","/"+name,{host:"registry.npmjs.org"})
	request.on("response",function(response) {
		var buffer=""
		response.on("data",function(data){buffer+=data})
		response.on("end",function(){
			var pkg
			try {
				pkg=JSON.parse(buffer)
			}
			catch(e) {
				//its a new package
				console.log("NEW PACKAGE")
				pkg={versions:{}}
			}
			if(pkg.versions[update.tag]) {
				exec("npm unpublish "+JSON.stringify(name+"@"+update.tag),function(error){
					if(error) throw error
					Upload(name,update,todos)
				})
			}
			else {
				Upload(name,update,todos)
			}
		})
	})
	request.end("")
}

function ManageRepo(push) {
	console.log( "REPO MANAGEMENT STARTED" )
	GetPackageJSON(push,function(pkg) {
		console.log(sys.inspect(pkg))
		GetTags(push,function(tags) {
			console.log("TAG INFO RECIEVED")
			console.log(sys.inspect(tags))
			//set up a ref to tag mapping
			var push_todos = todos[push.repository.name] =
				todos[push.repository.name]
				? todos[push.repository.name]
				: []
			Object.keys(tags).forEach(function(tag){
				console.log(pkg.name+"@"+tag)
				push_todos.push(
					{
						commit:tags[tag]
						,tag:tag
						,pkg:pkg
					}
				)
			})
			//start the processing!
			if(!working_on[push.repository.name]) {
				working_on[push.repository.name] = true
				ProcessCommits(push.repository.name,push_todos)
			}
		})
	})
}

module.exports = function(req,res){
	console.log("SERVER REQUEST BEING BUFFERED")
	var buffer=""
	req.on("data",function(data){buffer+=data})
	req.on("end",function() {
		console.log(buffer)
		var push
		try{
			push=JSON.parse(decodeURIComponent(buffer.slice(buffer.indexOf("=")+1)))
		}
		catch(e){
			res.writeHead(500)
			res.end()
			return
		}
		res.writeHead(200)
		res.end()
		console.log("RECIEVED PUSH")
		//only work on master
		if(push.ref == "refs/heads/master") {
			path.exists(push.repository.name,function(exists) {
				if(exists) {
					exec("git --git-dir="+push.repository.name+"/.git --work-tree=./ pull origin master",function(error){
						if(error) throw error
						ManageRepo(push)
					})
				}
				else {
					exec("git clone "+push.repository.url+".git",function(error) {
						if(error) throw error
						ManageRepo(push)
					})
				}
			})
		}
	})
}
