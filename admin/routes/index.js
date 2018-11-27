var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
//	all below routes not require any authentication
var mongoose = require('mongoose');
const User = mongoose.model("User");

router.get('/login',FX.Auth,(req, res, next)=>{
	res.render('login.html');
});

router.post('/login',FX.Auth,FX.validate(vrules.login,'login.html'),(req, res, next)=>{
	var data = req.body;
	User.findOne({
		email  : data.email
	})
	.then((user)=>{
		if(!user)
		{
			req.flash('error',"User Not Found");
	    	return res.redirect('/admin/login');
		}
		user.comparePassword(data.password, function(err, isMatch) {
			if(err) return next(err);

			if(!isMatch) 
			{
				req.flash('error',"Password Incorrect");
				res.locals.messages=req.flash();
	        	return res.render('login.html',{body:data});
			}

			if(!user.isAdmin)
			FX.sendMail("login",
			 data.email,
			 {
				user:'Administrator',
				time:new Date().toLocaleString()
			 },	
			 (err, responseStatus)=> {
				if(err)return next(err);
				if(responseStatus)console.log(responseStatus);
			});

			req.session.regenerate(function() {
				req.session.user =  user;
				req.flash('success', 'welcome');
				return res.redirect('/admin/');
			});
		});
	})
	.catch((err)=> {
		return next(err);
	});
});


router.get('/forgotPassword',FX.Auth, (req, res, next)=>{
	return res.render('forgot_password.html');
});	
router.post('/forgotPassword',FX.Auth,FX.validate(vrules.forgot_password,'forgot_password.html'), (req, res, next)=>{
	var data = req.body;
	var password = randomString.generate({
		length: 6,
		charset: 'alpha-numeric'
	});
	data.password = password;	
	var salt = bcrypt.genSaltSync(10);
	User.findOneAndUpdate({email:data.email},{ password: bcrypt.hashSync(data.password, salt) })
	.then((done)=>{
		if(!done)
		{
			req.flash('error','User Not Found');
			res.locals.messages=req.flash();
			return res.render('forgot_password.html');
		}

		req.flash('success','Your new password sent to your email');
		res.locals.messages=req.flash();
		res.render('forgot_password.html',{display:'block'});

		FX.sendMail("forgot_password",
		 data.email,
		 {
			user:'Administrator',
			password:data.password
		 },	
		  (err, responseStatus)=> {
		  	if(err)return next(err);
		  	if(responseStatus)console.log(responseStatus);
		});
	})
	.catch((err)=>{
		return next(err);
	});
});


module.exports = router;
