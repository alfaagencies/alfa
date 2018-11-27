const bcrypt = require('bcrypt');
var express = require('express');
var router = express.Router();

router.all('/',FX.adminAuth, (req, res, next)=>{
	var data = {};
	let lastMonth = new Date(new Date(new Date().setDate(1)).toISOString().substring(0,10));
	Promise.all([
		// User.count({isAdmin:false,isBusiness:false,isArchive:false}),
		// User.count({isAdmin:false,isBusiness:true,isArchive:false}),
		// User.count({isAdmin:false,isBusiness:false,isArchive:false,created:{$gte:lastMonth}}),
		// User.count({isAdmin:false,isBusiness:true,isArchive:false,created:{$gte:lastMonth}}),
		// Event.count({isArchive:false}),
		// Event.count({isArchive:false,created:{$gte:lastMonth}}),
		// Event.count({isArchive:false,status:true,approved:true})
	])
	.then(done=>{
		// data.userCount = done[0];
		// data.businessUserCount = done[1];
		// data.lastMonthUserCount = done[2];
		// data.lastMonthBusinessUserCount = done[3];
		// data.eventCount = done[4];
		// data.lastMonthEventCount = done[5];
		// data.activeEventCount = done[6];
		return res.render('dashboard.html', {data:data});	
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
		
		User.findOneAndUpdate({_id:user._id,isAdmin:true},{$set:{password:bcrypt.hashSync(data.new_password, salt)}},{new:true},function(err,data)
		{
			if(err)return next(err);
			if(data)res.redirect('/admin')
		});
	});
});

module.exports = router;
