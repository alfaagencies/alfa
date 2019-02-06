var express = require('express');
var router = express.Router();

router.get('/in',FX.adminAuth, (req, res, next)=>res.render('in.html'));

router.post('/in',FX.adminAuth,function(req,res,next){
    var { barCode, invoice, date } = req.body;
    var created = new Date(date);

    Invoice.findOne({ invoice },function(err,invoice){
        if(err)return next(err);

        if(!invoice || ( invoice && invoice.completed ))
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
                type:'in',
                // created: new Date(new Date().toISOString().substring(0,10))
                created
            },{ 
                $inc:{qty:1}
            },{
                upsert: true, 
                new: true
            },function(err,data){
                if(err)return next(err);
                res.json({ 
                    message:'Activity Successfull',
                    data:{
                        ...result,
                        qty: data.qty,
                    }
                });
            });
        });
    });
});

router.post('/in/invoice', FX.adminAuth, function(req,res,next){
    var { invoice, date } = req.body;
    var created = new Date(date);
    
    Invoice.findOne({
        invoice,
    },function(err,inVoice){
        if(err) return next(err);

        new Promise((resolve, reject)=>{
            
            if( inVoice && inVoice.completed )
            {
                return res.json({ message:'No Data Available'});
            }
            
            if(!inVoice)
            {
                Invoice.create({
                    invoice,
                    // created: new Date(new Date().toISOString().substring(0,10))
                    created
                },(err,invoice)=>{
                    if(err) return next(err);
                    resolve(invoice);
                });
            }
            else resolve(inVoice);
        }).then(invoice=>{
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
                        qty: data.qty
                    }))
                });
            });
        });
    });
});

router.get('/in/complete', FX.adminAuth, function(req, res, next){
    var { invoice } = req.query;

    Invoice.findOneAndUpdate({ invoice },{ $set:{ completed: true }},function(err,data){
        if(err) return next(err);

        if(data)
        {
            Stock.find({ invoice: data._id },(err,stock)=>{
                if(err) return next(err);

                Promise.all(stock.map((stock)=>{
                    var { product, type, qty } = stock;
                    return new Promise((resolve, reject)=>{
                        if(type === "in")
                        {
                            Product.update({ _id: product},{$inc:{qty}},(err,result)=>{
                                if(err) return next(err);
    
                                if(result) resolve(result);
                            });
                        }else resolve("no result");
                    });
                })).then((data)=>{
                    return res.json({
                        message:'Activity Successfull'            
                    });
                });
            });
        }
    });
});

router.post('/in/update', FX.adminAuth, function(req, res, next){
    var { barCode, invoice } = req.body;
    Invoice.findOne({ invoice },function(err,invoice){
        if(err)return next(err);

        if(!invoice || ( invoice && invoice.completed ))
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
                    qty: req.body.in
                }
            },{
                new: true
            },function(err,data){
                if(err)return next(err);
                res.json({ 
                    message:'Activity Successfull',
                    data:{
                        qty: data.qty,
                    }
                });
            });
        });
    });
});

module.exports = router;
