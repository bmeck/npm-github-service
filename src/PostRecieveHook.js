var http = require("http")
var exec = function() {
	console.log(Array.prototype.slice.call(arguments))
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
			})
		}
	})
}

//maintains a list of tags to process
var todos = {/*repo:{tag:'',commit:'',package.json:{...}}*/}
var working_on = {/*repo:true|false*/}

function GetTags(push,cb) {
	//get a new socket client
	var github_http=http.createClient(80,"github.com",true)
	var request = github_http.request(
		"GET"
		,"http://github.com/api/v2/json/repos/show/"+push.repository.owner.name+"/"+push.repository.name+"/tags"
		,{host:"github.com"}
	)
	request.on("response",function(response){
		var buffer=""
		response.on("data",function(data){
			buffer+=data
		})
		response.on("end",function(end){
			cb(JSON.parse(tags).tags)
		})
	})
	github_http.end()
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
	fs.writeFile(path.join(name,"package.json"),JSON.stringify(update.pkg),function(err) {
		if(err) throw err
		exec("git",["--git-dir",name,"checkout",update.commit],function(error){
			exec("npm",["publish",name],function(error){
				if(error) throw error
				ProcessCommits(name,todos)
			})
		})
	})
}

function PublishVersion(name,update,todos) {
	var npm_http = http.createClient(80,"registry.npmjs.org")
	var request = npm.request("/"+name)
	request.on("GET","response",function(response) {
		var buffer=""
		response.on("data",function(data){buffer+=data})
		response.on("end",function(){
			var pkg=JSON.parse(buffer)
			if(pkg.versions[update.tag]) {
				exec("npm",["unpublish",name+"@"+update.tag],function(error){
					if(error) throw error
					Upload(name,update,todos)
				})
			}
			else {
				Upload(name,update,todos)
			}
		})
	})
	request.end()
}

function ManageRepo(push) {
	GetPackageJSON(push,function(pkg) {
		GetTags(push,function(tags) {
			//set up a ref to tag mapping
			var todos = todos[push.repository.name] =
				todos[push.repository.name].concat(commit.commits)
				|| commit.commits
			Object.keys(tags).forEach(function(tag){
				todos.push(
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
				ProcessCommits(push.repository.name,todos)
			}
		})
	})
}

module.exports = function(req,res){
	console.log("SERVER REQUEST BEING BUFFERED")
	var buffer=""
	req.on("data",function(data){buffer+=data})
	req.on("end",function() {
		var push=JSON.parse(buffer)
		res.writeHead(200)
		res.end()
		console.log("RECIEVED PUSH")
		console.log(push)
		//only work on master
		if(push.ref == "refs/heads/master") {
			if(fs.isDirectory(push.repository.name)) {
				exec("git",["--git-dir",push.repository.name,"pull","origin","master"],function(error){
					if(error) throw error
					ManageRepo(push)
				})
			}
			else {
				exec("git",["clone",push.push.url+".git"],function(error) {
					if(error) throw error
					ManageRepo(push)
				})
			}
		}
	})
}