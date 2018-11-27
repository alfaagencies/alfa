var express = require('express');
var router = express.Router();
var csv = {};

router.get('/sign-s3',(req,res,next)=>{
	var {file,type}=req.query;
	//console.log("file==========>",file,"query========>",req.query);
	var params={
		Bucket:'clickapp',
	    Key: file,
	    Expires: 25000,
	    ContentType: type,
	    ACL: 'public-read'
	}
	FX.getSignedUrl('putObject',params).then((data)=>{

		//console.log("url====================>",data.url);
		res.status(200).json({data:data});
	});
});

router.post('/delete-s3Object',(req,res,next)=>{
	var {file}=req.body;
	var params={
		Bucket:'clickapp',
	    Key: file
	}
	FX.deleteObject(params).then((data)=>{
		//console.log("file============>",file);
		res.status(200).json({data:data});
	});
});

router.get('/users/csv',FX.adminAuth,(req,res,next)=>{
	User.find({isArchive:false},{_id:0,firstName:1,email:1,countryCode:1,mobile:1,location:1,website:1,description:1,created:1},(err,result)=>{
		if(err)return next(err);
		let columns={firstName:"Business Name",description:"Description",email:"Email",countryCode:"Country Code",mobile:"Mobile Number",
		location:"Location",website:"Website",created:"Created At"};

		csv.stringify(result,{header:true,columns:columns},(err,output)=>{
			res.json(output);
		});
	});
});

router.get('/users/:type?',FX.adminAuth, (req, res, next)=>{
	Country.find({},(err,result)=>{
		if(err)return next(err);
		if(req.params.type == "business")
		return res.render('businessUser.html',{country:result});
		return res.render('user.html',{country:result});
	});
});

router.post('/users/find/:type?',FX.adminAuth,(req,res,next)=>{
	//console.log("req.body=====================>",req.body);
	var {length,start}=req.body;
	var sort={};
	if(req.params.type == "business")
	{
		search_arr=["firstName","email","countryCode","mobile","location","website"];
		//sort_arr=["_id","picture","firstName","email","countryCode","mobile","location","website"];
		sort_arr=["_id","firstName","email","countryCode","mobile","location","website"];
		query=
		{
			isArchive:false,
			isBusiness:true,
			isAdmin:false
		}
	}
	else
	{
		search_arr=["firstName","lastName","email","mobile","location"];
		// sort_arr=["_id","picture","firstName","lastName","email","mobile","location"];
		sort_arr=["_id","firstName","lastName","email","mobile","location"];
		query=
		{
			isArchive:false,
			isBusiness:false,
			isAdmin:false
		}
	}
	var sort_key=sort_arr[parseInt(req.body["order[0][column]"])];
	var sort_val=req.body["order[0][dir]"]=="asc"?1:-1;
	sort[sort_key]=sort_val;
	//console.log("sort======>",sort);
	var limit=parseInt(length)>0?parseInt(length):'';

	if(req.body['search[value]'])
	{
		query["$or"]=[];
		search_arr.forEach(function(field){
			var obj={};
			obj[field] =
			{
		        '$regex': req.body['search[value]'],
		        '$options': 'i'
		    } 
			query["$or"].push(obj);
		});
	}

	User.count(query)
	.exec((err,result1)=>{
		if(err)return next(err);
		User.find(query)
		.sort(sort)
		.skip(parseInt(start))
		.limit(limit)
		.exec((err,result)=>{
			if(err)return next(err);
			res.json({recordsFiltered:result1,recordsTotal:result.length,data:result});
		});
	});

});

router.post('/users/check',FX.adminAuth,function(req,res,next){
	var element=FX.capitalize([Object.keys(req.body)[0]]);
	req.body.isArchive=false;
	User.count(req.body,function(err,result){
		if(err)return next(err);
		if(result)return res.json({message:element[0]+' Already Exist'});
		res.json(element[0]+' Not Found');
	});
});


router.post('/users/add/:type?',FX.adminAuth,function(req,res,next){
	var body=req.body;
	var {type}=req.params;
	if(type) 
	body.isBusiness=true;
	// console.log("req.body============>",req.body);
	// console.log("req.files============>",req.files);
	if(req.files && Object.keys(req.files).length === 1)
	{
		var {picture}=req.files;
		var random=FX.randomNumber(6,'');
	    body.picture=random+'-'+picture.name;
		FX.fileUpload(random,picture).catch((err)=>{next(err)});	
	}

	User.create(body,(err, user)=> {
		if(err)
		{
			// console.log("err",err);
			// if(err.code==11000)
			// {
			// 	req.flash('error','Action Failed : Email already exist');
			// 	return res.redirect('/admin/users/'+type?type:'');
			// }
			return next(err);
		}
		//console.log("user created successfully===========================>");
		return res.redirect('/admin/users/'+type?type:'');	
	});
});

router.post('/users/edit/:type?',FX.adminAuth,function(req,res,next){
	var body=req.body
	var {type}=req.params;
	if(req.files && Object.keys(req.files).length === 1)
	{
		var {picture}=req.files;
		var random=FX.randomNumber(6,'');
	    req.body.picture=random+'-'+picture.name;
		FX.fileUpload(random,picture).catch((err)=>{next(err)});	
	}
	
	User.findByIdAndUpdate(body.id,body,function(err,result){
		if(err)return next(err);
		return res.redirect('/admin/users/'+type?type:'');
	});
});

router.get('/users/delete/:id',FX.adminAuth,function(req,res,next){
	User.findByIdAndUpdate(req.params.id,{$set:{isArchive:true}},function(err,result){
		if(err)return next(err);
		if(result)
		res.status(200).json({message:`user deleted`});
	});
});

router.get('/users/view/:id',FX.adminAuth,function(req,res,next){
	User.findById(req.params.id,function(err,result){
		if(err)return next(err);
		res.status(200).json(result);

		if(!result.isAdminNotified)
		{
			User.findByIdAndUpdate(req.params.id,{$set:{isAdminNotified:true}},function(err,result){
				if(err)return next(err);
			});
		}
	});
});

router.post('/users/adminNotify/:id',FX.adminAuth,function(req,res,next){
	(req.body.isAdminNotified === 'false')?
	User.findByIdAndUpdate(req.params.id,{$set:{isAdminNotified:true}},function(err,result){
		if(err)return next(err);
		res.json({message:"done"});
	})
	:
	res.json({message:"already notified"});
});


router.post('/users/status',FX.adminAuth,function(req,res,next){
	var {id,status}=req.body;
	User.findByIdAndUpdate(id,{$set:{status}},function(err,result){
		if(err)return next(err);
		if(result)
		res.status(200).json({message:`status changed ${status}`});
	});
});

router.post('/users/approve',FX.adminAuth,function(req,res,next){
	var {id,approve}=req.body;
	User.findByIdAndUpdate(id,{$set:{approved:approve}},function(err,result){
		if(err)return next(err);
		if(result)
		res.status(200).json({message:`approved changed ${approve}`});
	});
});

module.exports = router;
