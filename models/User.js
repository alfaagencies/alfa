var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var userSchema = new Schema({
	name: {
		type: String,
		default: ''
	},
	city: {
		type: String,
		default: ''
	},
	password:  String,
	isAdmin: {
		type: Boolean, // true for Administrator
		default: false
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

userSchema.methods.comparePassword = function (candidatePassword, cb) {
	bcrypt.compare(candidatePassword, this.password, function (err, isMatch) {
		return cb(err, isMatch);
	});
}

module.exports = mongoose.model('User', userSchema)