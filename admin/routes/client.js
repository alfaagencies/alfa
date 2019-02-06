var express = require('express');
var router = express.Router();
var fs = require('fs');
var parse = require('csv-parse');
var { Readable } = require('stream');

router.get('/clients',FX.adminAuth, (req, res, next)=>res.render('client.html'));

router.post('/clients/find',FX.adminAuth,(req,res,next)=>{
	var {length,start}=req.body;
	var sort={};
	search_arr=["name","city"];
	sort_arr=["_id","name","city"];
	query={ isArchive:false }

	var sort_key=sort_arr[parseInt(req.body["order[0][column]"])];
	var sort_val=req.body["order[0][dir]"]=="asc"?1:-1;
	sort[sort_key]=sort_val;
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
	var body=req.body;

	User.count(body,(err, user)=> {
		if(err)return next(err);
		if(user)
		{
			return res.json({ 
				error: true, 
				message:"Client Already Exist"
			});	
		}

		return res.json({ 
			error: false, 
			message:"Good to go!"
		});	
	});
});

router.post('/clients/add',FX.adminAuth,function(req,res,next){
    User.create(req.body,function(err,result){
        if(err)return next(err);
        if(result)
        res.redirect('/admin/clients');
    });
});

router.post('/clients/edit',FX.adminAuth,function(req,res,next){
	var {id,...body}=req.body;
    User.findByIdAndUpdate(id,{$set:body},function(err,result){
        if(err)return next(err);
        if(result)
        res.redirect('/admin/clients');        
    });
});
router.get('/clients/delete/:id',FX.adminAuth,function(req,res,next){
	User.findByIdAndUpdate(req.params.id,{$set:{isArchive:true}},function(err,result){
		if(err)return next(err);
		if(result)
		res.status(200).json({message:`client deleted`});
	});
});

router.post('/clients/import', FX.adminAuth, function(req,res,next){
	var readable = new Readable();
	readable.push(req.files.files.data);
	readable.push(null);
	var headers = {
		Name: 'name',
		City: 'city'
	};

	var count = 0;
	var  firstRow, error=[], csvData = [] ;

    readable.pipe(parse({delimiter: ','}))
    .on('data', function(csvrow) {
		
		if(count === 0) {
			firstRow = csvrow;
		} else {
			var user = {}; 
			for(var i = 0; i< csvrow.length; i++) {
				user[headers[firstRow[i]]] = csvrow[i].toUpperCase();
			}

			csvData.push(user);
		}
		count++;       
    })
    .on('end', async function() {

		try {
			for(const [count,user] of csvData.entries()) {
	
				var result = await User.findOne(user);
				
				if(!result) {
					await User.create(user);
				} else {
					error.push(count+2);
				}
			}
		} catch(e) {
			next(e);
		}

		res.status(200).json({message:`import completed`});

	 	 if(error.length) {
			var destination = path.join(__dirname,'../../errors','Clients'+'_'+ req.files.files.name + '_' + new Date().toISOString() + '.txt');
			var data = `Unable to add the following client entries on line:\n${error.join('\n')}`;
			fs.appendFile(destination,data,'utf8',(err, done)=>{
				if(err) return next(err);

			});
	  	}

    });
});

module.exports = router;