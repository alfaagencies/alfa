var express = require('express');
var router = express.Router();
var csv = require('csv');
var fs = require('fs');
var parse = require('csv-parse');
var { Readable } = require('stream');

router.get('/products/csv', FX.adminAuth, (req, res, next) => {
	Product.aggregate([
		{
			$match:{
				isArchive: false
			}
		},
		{
			$lookup: {
				from: 'brands',
				localField: 'brand',
				foreignField: '_id',
				as: 'brand'
			}
		},
		{
			$unwind: '$brand'
		},
		{
			$sort:{ styleCode:1, size:1 }
		}
	], (err, result) => {
		if (err) return next(err);
		let columns = [
			{ key: "brand", header: "Brand" },
			{ key: "styleCode", header: "Style With Color" },
			{ key: "barCode", header: "Bar Code" },
			{ key: "size", header: "Size" },
			{ key: "mrp", header: "MRP" }
		];

		csv.stringify(
			result.map(element => {
				var obj = {};
				obj.brand = element.brand.name;
				obj.styleCode = element.styleCode;
				obj.mrp = element.mrp;
				obj.barCode = element.barCode;
				obj.size = element.size;
				return obj;
			}),
			{ header: true, columns: columns }, (err, output) => {
				res.json(output);
			});
	});
});

router.get('/products',FX.adminAuth, (req, res, next)=>{
    Brand.find({ isArchive: false },'_id name',(err,brand)=>{
        if(err) return next(err);
        res.render('product.html',{ brand });
    });
});

router.post('/products/find',FX.adminAuth,(req,res,next)=>{
	var {length,start}=req.body;
	var sort={};
	search_arr=["styleCode","mrp","size","barCode"];
	sort_arr=["_id","brand","styleCode","mrp","size","barCode"];
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
			["mrp","size"].indexOf(field) === -1 ?
			obj[field] = {
				'$regex': req.body['search[value]'],
		        '$options': 'i'
			}: obj =
			{
				'$where': `/${req.body['search[value]']}/.test(this.${field})`,
			}; 
			query["$or"].push(obj);
		});
	}

	Product.count(query)
	.exec((err,result1)=>{
		if(err)return next(err);
		Product.find(query)
		.sort(sort)
		.skip(parseInt(start))
		.limit(limit)
		.exec((err,result)=>{
            if(err)return next(err);
			Brand.populate(result,{path:"brand", select:"name"},(err,result)=>{
				if(err)return next(err);
				res.json({recordsFiltered:result1,recordsTotal:result.length,data:result});
			});
		});
	});
});

router.post('/products/add',FX.adminAuth,function(req,res,next){
	var { brand, styleCode, size } = req.body;
	Product.findOne({ brand, styleCode, size },(err,result)=>{
		if(err)return next(err);
		if(!result)
		{
			Product.create(req.body,function(err,result){
				if(err)return next(err);
				if(result) return res.redirect('/admin/products');
			});
		}
		else{
			req.flash('error','Product Already Exist');
			// res.locals.messages=req.flash();
			Brand.find({ isArchive: false },'_id name',(err,brand)=>{
				if(err) return next(err);
				res.render('product.html',{ brand });
			});
		}
	});
});

router.post('/products/edit',FX.adminAuth,function(req,res,next){
	var {id,brand,...body}=req.body;
    Product.findByIdAndUpdate(id,{$set:{brand:ObjectId(brand),...body}},function(err,result){
        if(err)return next(err);
        if(result)
        res.redirect('/admin/products');        
    });
});
router.get('/products/delete/:id',FX.adminAuth,function(req,res,next){
	Product.findByIdAndUpdate(req.params.id,{$set:{isArchive:true}},function(err,result){
		if(err)return next(err);
		if(result) return res.status(200).json({message:`product deleted`});
	});
});

router.post('/products/import', FX.adminAuth, function(req,res,next){
	var readable = new Readable();
	readable.push(req.files.files.data);
	readable.push(null);
	var headers = {
		"Brand": 'brand',
		"Style With Color": 'styleCode',
		"Bar Code": 'barCode',
		"Size": 'size',
		"MRP": 'mrp'
	};

	var count = 0;
	var  firstRow, error=[], csvData = [] ;

    readable.pipe(parse({delimiter: ','}))
    .on('data', function(csvrow) {
		if(count === 0) {
			firstRow = csvrow;
		} else {
			if(csvrow.indexOf("") === -1) {
				var product = {}; 
				for(var i = 0; i< csvrow.length; i++) {
					product[headers[firstRow[i]]] = (firstRow[i] === "Brand" || firstRow[i] === "Style With Color") ? csvrow[i].toUpperCase() : csvrow[i];
				}
				csvData.push(product);
			}
		}
		count++;       
    })
    .on('end', async function() {

		try {
			for(var [count,product] of csvData.entries()) {
	
				var brand = await Brand.findOne({ name: product.brand });

				if(!brand) {
					error.push(count+2);
				} else {
					product.brand = brand._id;
					var { brand, styleCode, size } = product;
					var result = await Product.findOne({ brand, styleCode, size });

					if(!result) {
						await Product.create(product);
					} else {
						error.push(count+2);
					}
				}
				
			}
		} catch(e) {
			next(e);
		}

		res.status(200).json({message:`import completed`});

	 	 if(error.length) {
			var destination = path.join(__dirname,'../../errors','Products'+'_'+ req.files.files.name + '_' + new Date().toISOString() + '.txt');
			var data = `Unable to add the following product entries on line:\n${error.join('\n')}`;
			fs.appendFile(destination,data,'utf8',(err, done)=>{
				if(err) return next(err);

			});
	  	}

    });
});

module.exports = router;