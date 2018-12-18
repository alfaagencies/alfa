var express = require('express');
var router = express.Router();

router.get('/in',FX.adminAuth, (req, res, next)=>res.render('in.html'));


router.post('/in',FX.adminAuth,function(req,res,next){
    var { barCode, invoice } = req.body;
    Invoice.findOne({ invoice },function(err,invoice){
        if(err)return next(err);

        if(!invoice || ( invoice && invoice.completed && !req.session.user.isAdmin ))
        {
            return res.json({ message:'No Data Available'});
        }

        Product.findOne({barCode})
        .populate('brand','name')
        .lean()
        .exec((err,result)=>{
            if(err)return next(err);
            
            if(!result)
            {
                return res.json({ message:'No Data Available'});
            }
    
            Stock.findOneAndUpdate({ 
                product: result._id,
                invoice: invoice._id,
                created: new Date(new Date().toISOString().substring(0,10))
            },{ 
                $inc:{in:1}
            },{
                upsert: true, 
                new: true
            },function(err,data){
                if(err)return next(err);
                res.json({ 
                    message:'Activity Successfull',
                    data:{
                        ...result,
                        in: data.in,
                        out: data.out
                    }
                });
            });
        });
    });
});

router.post('/in/invoice', FX.adminAuth, function(req,res,next){
    var { invoice } = req.body;
    Invoice.findOneAndUpdate({
        invoice,
        created: new Date(new Date().toISOString().substring(0,10))
    },{
        $set:{}
    },{
        upsert: true,
        new: true
    },function(err,invoice){
        if(err) return next(err);

        if(!invoice || ( invoice && invoice.completed && !req.session.user.isAdmin ))
        {
            return res.json({ message:'No Data Available'});
        }

       Stock.find({
           invoice: invoice._id
       })
       .populate({
            path: 'product',
            populate: [{
                path: 'brand',
                model: 'Brand',
                select:'name'
            }] 
        })
        .lean()
        .exec((err,data)=>{
           if(err) return next(err);

           if(!data)
           {
               return res.json({ message:'No Data Available'});
           }

            res.json({ 
                message:'Activity Successfull',
                data:data.map(data=>({
                    ...data.product,
                    in: data.in,
                    out: data.out
                }))
            });
       });
    });
});

router.get('/in/complete', FX.adminAuth, function(req, res, next){
    var { invoice } = req.query;

    Invoice.update({ invoice },{ $set:{ completed: true }},function(err,data){
        if(err) return next(err);

        if(data)
        return res.json({
            message:'Activity Successfull'            
        });
    });
});

router.post('/in/update', FX.adminAuth, function(req, res, next){
    var { barCode, invoice } = req.body;
    Invoice.findOne({ invoice },function(err,invoice){
        if(err)return next(err);

        if(!invoice || ( invoice && invoice.completed && !req.session.user.isAdmin ))
        {
            return res.json({ message:'No Data Available'});
        }

        Product.findOne({barCode},(err,result)=>{
            if(err)return next(err);
            
            if(!result)
            {
                return res.json({ message:'No Data Available'});
            }
    
            Stock.findOneAndUpdate({ 
                product: result._id,
                invoice: invoice._id
            },{ 
                $set:{ 
                    in: req.body.in 
                }
            },{
                new: true
            },function(err,data){
                if(err)return next(err);
                res.json({ 
                    message:'Activity Successfull',
                    data:{
                        in: data.in,
                    }
                });
            });
        });
    });
});

module.exports = router;
