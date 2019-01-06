var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var stockSchema = new Schema({
	product:{
        type:Schema.Types.ObjectId,
        ref:"Product"
    },
    invoice:{
        type:Schema.Types.ObjectId,
        ref:"Invoice"
    },
    type:String,
    qty:{
        type:Number,
        default:0
    },
    created:{
        type:Date,
        default:new Date()
    }
},
{
	id: false,
	toJSON: {
		getters: true,
		virtuals: true
	},
	toObject: {
		getters: true,
		virtuals: true
	}
});

module.exports = mongoose.model('Stock', stockSchema)