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

        if(!data)
        {
            return res.json({ message:'No Data Available'});
        }

        res.json({ 
            message:'Activity Successfull',
            data
        });
    });
});

module.exports = router;