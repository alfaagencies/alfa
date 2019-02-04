var express = require('express');
var router = express.Router();
var csv = require('csv');

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
	Product.findOne(req.body,(err,result)=>{
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
module.exports = router;