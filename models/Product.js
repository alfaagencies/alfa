var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var productSchema = new Schema({
    brand:{
        type:Schema.Types.ObjectId,
        ref:"Brand"
    },
	styleCode:String,
    mrp:Number,
    size:Number,
	barCode:String,
	qty:{
		type:Number,
		default: 0
	},
	isArchive: {
		type: Boolean,
		default: false
	}
},
{
	timestamps: {
		createdAt: 'created',
		updatedAt: 'updated'
	},
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

module.exports = mongoose.model('Product', productSchema)