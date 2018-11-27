var express = require('express');
var router = express.Router();

router.get('/pages',FX.adminAuth, (req, res, next)=>{
	StaticPage.find({},function(err,page){
		if(err)return next(err);
		res.render('page.html',{page:page});
	});
});

router.post('/pages/edit',FX.adminAuth,function(req,res,next){
	let {title,description,slug}=req.body;
	StaticPage.findOneAndUpdate({slug},{$set:{title,description}},function(err,result){
		if(err)return next(err);
		return res.redirect('/admin/pages');
	});
});

module.exports = router;
