var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var invoiceSchema = new Schema({
	invoice:{
        type:String,
        required: true
    },
    completed:{
        type:Boolean,
        default:false
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

module.exports = mongoose.model('Invoice', invoiceSchema)