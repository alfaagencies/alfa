var express = require('express');
var router = express.Router();

router.get('/out',FX.adminAuth, (req, res, next)=>{
    User.find({
        name:{$exists: true}, 
        city:{$exists:true},
        isArchive: false
    },(err,clients)=>{
        if(err) return next(err);
        res.render('out.html',{ clients });
    });
});

router.post('/out',FX.adminAuth,function(req,res,next){
    var { barCode, invoice } = req.body;
    Invoice.findById(invoice,function(err,invoice){
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

            Stock.findOne({ 
                product: result._id,
                invoice: invoice._id,
                type:'out',
                created: new Date(new Date().toISOString().substring(0,10))
            },(err, data)=>{
                if(err)return next(err);
                
                if((result.qty - (data && data.qty || 0)) > 0)
                {
                    Stock.updateOne({ 
                        product: result._id,
                        invoice: invoice._id,
                        type:'out',
                        created: new Date(new Date().toISOString().substring(0,10))
                    },{ 
                        $inc:{qty:1}
                    },{
                        upsert: true,
                        new: true
                    },function(err,stock){
                        if(err)return next(err);
                        res.json({ 
                            error:false,
                            message:'Activity Successfull',
                            data:{
                                ...result,
                                qty: (data && data.qty || 0) + 1,
                            }
                        });
                    });
                }
                else{
                    res.json({ 
                        error:true,
                        message:'Action Aborted: Product not in stock',
                        data:{}
                    });
                }
            });
        });
    });
});

router.post('/out/invoice', FX.adminAuth, function(req,res,next){
    var { invoice } = req.body;
    var [name, city] = invoice.split(',').map(val=>val.trim());

    User.findOne({ name, city },(err,user)=>{
        if(err) return next(err);
        if(user)
        {
            Invoice.findOne({
                invoice,
                created:{ $gte: new Date(new Date().toISOString().substring(0,10)) },
                completed:false
            },function(err,inVoice){
                if(err) return next(err);
        
                new Promise((resolve, reject)=>{
                    
                    if(!inVoice)
                    {
                        Invoice.create({
                            invoice,
                            created: new Date(new Date().toISOString().substring(0,10))
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
                            error: false,
                            message:'Activity Successfull',
                            invoiceId: invoice._id,
                            data:data.map(data=>({
                                ...data.product,
                                qty: data.qty
                            }))
                        });
                    });
                });
            });
        }
        else{
            res.json({ 
                error: true,
                message:'Client Not Found',
                data:[]
            });
        }
    });

});

router.get('/out/complete', FX.adminAuth, function(req, res, next){
    var { invoice } = req.query;

    Invoice.findByIdAndUpdate(invoice,{ $set:{ completed: true }},function(err,data){
        if(err) return next(err);

        if(data)
        {
            Stock.find({ invoice: data._id },(err,stock)=>{
                if(err) return next(err);

                Promise.all(stock.map((stock)=>{
                    var { product, type, qty } = stock;
                    return new Promise((resolve, reject)=>{
                        if(type === "out")
                        {
                            Product.update({ _id: product},{$inc:{qty: -qty}},(err,result)=>{
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

router.post('/out/update', FX.adminAuth, function(req, res, next){
    var { barCode, invoice } = req.body;
    Invoice.findById(invoice, function(err,invoice){
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

            if((result.qty - req.body.out*1) >= 0)
            {
                Stock.findOneAndUpdate({ 
                    product: result._id,
                    invoice: invoice._id
                },{ 
                    $set:{ 
                        qty: req.body.out
                    }
                },{
                    new: true
                },function(err,data){
                    if(err)return next(err);
                    res.json({ 
                        message:'Activity Successfull',
                        data:{
                            qty: data.qty,
                            styleCode: result.styleCode
                        }
                    });
                });
            }
            else{
                res.json({ 
                    error:true,
                    message:'Action Aborted: Product not in stock',
                    data:{}
                });
            }
        });
    });
});

module.exports = router;
