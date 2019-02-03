var express = require('express');
var router = express.Router();

router.get('/history',FX.adminAuth, (req, res, next)=>res.render('history.html'));

router.post('/history', FX.adminAuth, (req, res, next)=>{
    var { from, to, type } = req.body;

    Stock.aggregate([
        {
            $match:{
                type, 
                created:{
                    $gte: new Date(from),
                    $lte: new Date(to)
                }
            }
        },
        {
            $group:{
                _id:{
                    created:"$created",
                    invoice:"$invoice"
                },
                qty:{$sum:"$qty"}
            }
        },
        {
            $lookup:{
                from: 'invoices',
                localField:'_id.invoice',
                foreignField: '_id',
                as: 'invoice'
            }
        },
        {
            $unwind:"$invoice"
        },
        {
            $match:{
                'invoice.completed': true
            }
        }
    ],function(err,stock){
        if(err)return next(err);

        if(!stock)
        {
            return res.json({ message:'No Data Available'});
        }

        res.json({ 
            message:'Activity Successfull',
            data:stock
        });
    });
});

router.post('/history/invoice', FX.adminAuth, (req, res, next)=>{
    var { id } = req.body;
    Stock.find({
        invoice: ObjectId(id)
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

        if(!data)  {
            return res.json({ message:'No Data Available'});
        }

        res.json({ 
            message:'Activity Successfull',
            data
        });
    });
});

router.post('/history/invoice/update', FX.adminAuth, (req,res,next)=>{
    var { invoice, type, barCode, qty } = req.body;

    Product.findOne({barCode},(err,result)=>{
        if(err)return next(err);
        
        if(!result) {
            return res.json({ message:'No Data Available'});
        }

        Stock.findOne({ 
            product: result._id,
            invoice
        },function(err,stock){
            if(err)return next(err);

            if(!stock) {
                return res.json({ message:'No Data Available'});
            }

            var newQty = type === "out" ? (stock.qty - qty*1) : (qty*1 - stock.qty);

            if((result.qty + newQty) >= 0) {
                Stock.updateOne({
                    product: result._id,
                    invoice
                },{
                    $set:{
                        qty
                    }
                },(err, result)=>{
                    if(err) return next(err);

                    Product.updateOne({ barCode },{ $inc:{
                        qty: newQty
                    }},(err, result)=>{
                        if(err) return next(err);

                        res.json({ 
                            message:'Activity Successfull',
                            data:{}
                        });
                    });
                });
            }
            else {
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