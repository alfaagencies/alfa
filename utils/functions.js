var mongoose = require('mongoose');
var EmailTemplate = require('email-templates').EmailTemplate;
const crypto = require('crypto');
const User = mongoose.model("User");


const nodemailer = require('nodemailer');
const transport = nodemailer.createTransport({
	from: process.env.SMTP_FROM,
	host: process.env.SMTP_HOST, // hostname
	service: process.env.SMTP_SERVICE,
	auth: {
		user: process.env.SMTP_AUTH_USER,
		pass: process.env.SMTP_AUTH_PASS
	}
});


module.exports = {
	Auth: function(req,res,next)
	{
		if (req.url == '/login' || req.url == '/forgotPassword') 
		{
            if (req.session.user) {
                return res.redirect(admin_url);
            }
            return next();
        } else if (req.session.user) {
            return next(); 
        } else {
            req.flash('error', 'Unauthorized Access');
            return res.redirect('/admin/login');
        }
	},
	adminAuth: function(req, res, next) {
        if (req.session.user)return next();
        else {
            req.flash('error', 'Unauthorized Access');
            return res.redirect('/admin/login');
        }
    },
    capitalize:function(body){
        Object.keys(body).forEach((element)=>{
            body[element]=body[element].split(' ')
            .map(function(elem){
                if(element !== "email" && element !== "password" && element !== "type")
                elem=_.capitalize(elem);
                return elem;   
            }).join(' ');    
        });    
        return body;
    },
    randomNumber:function(length,charset){
	    var charSet=charset||"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
	    var i=0,rnum,random="";
	    while(i<length)
	    {
	     rnum=Math.floor(Math.random()*charSet.length);
	     random+=charSet.substring(rnum,rnum+1);
	     i++;
	    }
	    return random;
	},
	crypto: function(text, type) {
		var algorithm = 'aes256'; // or any other algorithm supported by OpenSSL
		var key = 'password';

		if(type.toString() === 'encrypt') {
				var cipher = crypto.createCipher(algorithm, key);
				var encrypted = cipher.update(text.toString(), 'utf8', 'hex') + cipher.final('hex');
				return encrypted.toString();
		} else {
				var decipher = crypto.createDecipher(algorithm, key);
				var decrypted = decipher.update(text.toString(), 'hex', 'utf8') + decipher.final('utf8');
				return decrypted.toString();
		}
	},
	sendMail: function(template, email, email_data,cb) {
		var template = new EmailTemplate(path.join(__dirname, '../templates/', template));

		if(!template) return cb("template not found");

		// Send a single email
		template.render(email_data, (err, results)=>{
			if(err) return cb(err, null);
			transport.sendMail({
					from: process.env.FROM_MAIL,
					to: email,
					subject: results.subject,
					html: results.html,
					//text: results.text
				}, 
				function(err, responseStatus) {
				return cb(err, responseStatus);
			});
		});
	},
	validate: function(rulesObj,template,path) {
        return function(req, res, next) {
            // Validating Input 
            var validation = new Validator(req.body, rulesObj,
            {
             "min.password":"Password must be minimum of 8 characters",
             "numeric.age":"Age Must Be In Numbers",
             "regex.contact_number":"Phone number must be a 10 digit number",
             "regex.name":"Name must not contain special characters",
             "required.id":"Invalid, Please Enter Again",
             "required.lat":"Enter a Valid Address",
             "required.lng":"Enter a Valid Address",
             "same.confirm_password":"Password Doesn't Match",
             "url.website_url":"Enter a Valid URL"
            });

            if (validation.fails()) 
            {
                var errObj= validation.errors.all();
                req.flash('error',errObj[Object.keys(errObj)[0]][0]);
                console.log("validation failed",errObj[Object.keys(errObj)[0]][0]);
                res.locals.messages=req.flash();
                res.render(template,{body:req.body});
            }
            else  return next();
        }
    }
};
