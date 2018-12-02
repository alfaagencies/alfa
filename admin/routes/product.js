var express = require('express');
var router = express.Router();

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
    Product.create(req.body,function(err,result){
        if(err)return next(err);
		if(result)
		{
			res.redirect('/admin/products');
			Brand.findByIdAndUpdate(req.body.brand,{$inc:{qty:1}},err=>err && next(err));
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
		if(result)
		{
			res.status(200).json({message:`product deleted`});
			Brand.findByIdAndUpdate(result.brand,{$inc:{qty:-1}},err=>err && next(err));
		}
	});
});


module.exports = router;
