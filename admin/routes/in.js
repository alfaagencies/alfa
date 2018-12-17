var express = require('express');
var router = express.Router();

router.get('/in',FX.adminAuth, (req, res, next)=>res.render('in.html'));


router.post('/in',FX.adminAuth,function(req,res,next){
    var { barCode } = req.body;
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

module.exports = router;
