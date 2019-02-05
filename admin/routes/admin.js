const bcrypt = require('bcrypt');
var express = require('express');
var router = express.Router();
const { spawn } = require('child_process');

router.all('/',FX.adminAuth, (req, res, next)=>{
	var data = {};
	let lastMonth = new Date(new Date().setDate(1));
	Promise.all([
		Stock.aggregate([
			{
				$match:{
					created: {$gte: lastMonth }, type:"in"
				}
			},
			{
				$group:{_id:null, count:{$sum:"$qty"}}
			}
		]),
		Stock.aggregate([
			{
				$match:{
					created: {$gte: lastMonth }, type:"out"
				}
			},
			{
				$group:{_id:null, count:{$sum:"$qty"}}
			}
		]),
		Product.aggregate([{$group:{_id:null, count:{$sum:"$qty"}}}])
	])
	.then(done=>{
		data.inCount = (done[0][0] && done[0][0].count) || 0;
		data.outCount = (done[1][0] && done[1][0].count) || 0;
		data.stockCount = (done[2][0] && done[2][0].count) || 0;
console.log(data, done);
		return res.render('dashboard.html', { data });	
	})
	.catch(err=>{
		next(err)
	});
});


router.all('/logout', (req, res, next)=>{
	req.session.destroy;
	// Deletes the cookie.
	delete req.session.user;
	req.flash('success', 'Your are successfully logged out.');
	res.redirect('/admin/login');
});

router.get('/changePassword',FX.adminAuth,(req,res,next)=>{
	return res.render('change_password.html');
});

router.post('/changePassword',FX.adminAuth,FX.validate(vrules.change_password,'change_password.html'),(req, res, next)=>{
	var data = req.body
	var salt = bcrypt.genSaltSync(10);
	var user = req.session.user; 

	bcrypt.compare(data.password,user.password, function(err, isMatched) {
		if(err) return next(err)
		if(!isMatched)
		{
			req.flash('error','Incorrect Password');
			return res.redirect('/admin/changePassword');
		}
		
		User.findOneAndUpdate({_id:user._id,isAdmin:true},{$set:{password:bcrypt.hashSync(data.new_password, salt)}},{new:true},function(err,data){
			if(err)return next(err);
			if(data)res.redirect('/admin')
		});
	});
});

router.post('/cv_upload', FX.adminAuth, (req, res, next)=>{
	
});

module.exports = router;
