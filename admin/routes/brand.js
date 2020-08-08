var express = require('express');
var router = express.Router();
var csv = require('csv');

router.get('/brands/csv', FX.adminAuth, (req, res, next) => {
	Product.aggregate([
		{
			$match:{
				isArchive: false
			}
		},
		{
			$group: {
				_id: { brand: "$brand", styleCode: "$styleCode" },
				mrp: { $first: "$mrp" },
				size: { $push: { size: "$size", count: { $sum: "$qty" } } },
				totalQty: { $sum: "$qty" }
			}
		},
		{
			$lookup: {
				from: 'brands',
				localField: '_id.brand',
				foreignField: '_id',
				as: 'brand'
			}
		},
		{
			$unwind: '$brand'
		},
		{
			$sort:{ styleCode:1 }
		}
	], (err, result) => {
		if (err) return next(err);
		let columns = [
			{ key: "brand", header: "Brand" },
			{ key: "styleCode", header: "Style With Color" },
			{ key: "mrp", header: "MRP" },
			{ key: "0", header: "0" },
			{ key: "1", header: "1" },
			{ key: "2", header: "2" },
			{ key: "3", header: "3" },
			{ key: "4", header: "4" },
			{ key: "5", header: "5" },
			{ key: "6", header: "6" },
			{ key: "7", header: "7" },
			{ key: "8", header: "8" },
			{ key: "9", header: "9" },
			{ key: "10", header: "10" },
			{ key: "11", header: "11" },
			{ key: "12", header: "12" },
			{ key: "13", header: "13" }
		];

		csv.stringify(
			result.reduce((arr,element) => {
				
				if(element.totalQty > 0) {
					var obj = {
						"0": "",
						"1": "",
						"2": "",
						"3": "",
						"4": "",
						"5": "",
						"6": "",
						"7": "",
						"8": "",
						"9": "",
						"10": "",
						"11": "",
						"12": "",
						"13": ""
					};
					obj.brand = element.brand.name;
					obj.styleCode = element._id.styleCode;
					obj.mrp = element.mrp;

					element.size.forEach(el => {
						obj[el.size] = el.count;
					});
					arr.push(obj);
				}
				return arr;
			},[]),
			{ header: true, columns: columns }, (err, output) => {
				res.json(output);
			});
	});
});

router.get('/brands', FX.adminAuth, (req, res, next) => res.render('brand.html'));

router.post('/brands/find', FX.adminAuth, (req, res, next) => {
	var { length, start } = req.body;
	var sort = {};

	search_arr = ["brand.name"];
	sort_arr = ["_id", "brand.name", "qty"];
	query = {
		["brand.isArchive"]: false
	};

	var sort_key = sort_arr[parseInt(req.body["order[0][column]"])];
	var sort_val = req.body["order[0][dir]"] == "asc" ? 1 : -1;
	sort[sort_key] = sort_val;
	var limit = parseInt(length) > 0 ? parseInt(length) : '';

	if (req.body['search[value]']) {
		query["$or"] = [];
		search_arr.forEach(function (field) {
			var obj = {};
			obj[field] =
				{
					'$regex': req.body['search[value]'].replace(/([\.\(\)\\])/g,"\\$1"),
					'$options': 'i'
				}
			query["$or"].push(obj);
		});
	}

	var lookup = {
		$lookup: {
			from: 'brands',
			localField: '_id',
			foreignField: '_id',
			as: 'brand'
		}
	};

	var group = {
		$group: {
			_id: "$brand",
			qty: { $sum: "$qty" }
		}
	};

	var match = {
		$match: query
	};

	var unwind = {
		$unwind: "$brand"
	};

	Product.aggregate([
		{
			$match: {
				isArchive: false
			}
		},
		group,
		lookup,
		unwind,
		match
	]
		, (err, result1) => {
			if (err) return next(err);
			Product.aggregate([
				{
					$match: {
						isArchive: false
					}
				},
				group,
				lookup,
				unwind,
				match,
				{
					$sort: sort
				},
				{
					$skip: start * 1
				},
				{
					$limit: limit
				}
			]
				, (err, result) => {
					if (err) return next(err);
					res.json({ recordsFiltered: result1.length, recordsTotal: result.length, data: result });
				});
		});

});

router.post('/brands/check', FX.adminAuth, function (req, res, next) {
	var body = req.body;
	if(body._id) {
		body._id = { $ne: ObjectId(body._id) };
	};

	Brand.count(body, (err, brand) => {
		if (err) return next(err);
		if (brand) {
			return res.json({
				error: true,
				message: "Brand Already Exist"
			});
		}

		return res.json({
			error: false,
			message: "Good to go!"
		});
	});
});


router.post('/brands/add', FX.adminAuth, function (req, res, next) {
	var body = req.body;
	
	body.barcodeLength = body.barcodeLength ? body.barcodeLength.split(",") : [];

	Brand.create(body, (err, brand) => {
		if (err) return next(err);
		return res.redirect('/admin/brands');
	});
});

router.post('/brands/edit', FX.adminAuth, function (req, res, next) {
	var body = req.body;

	body.barcodeLength = body.barcodeLength ? body.barcodeLength.split(",") : [];

	Brand.findByIdAndUpdate(body.id, body, function (err, result) {
		if (err) return next(err);
		return res.redirect('/admin/brands');
	});
});

router.get('/brands/delete/:id', FX.adminAuth, function (req, res, next) {
	Brand.deleteOne({ _id: ObjectId(req.params.id) }, function (err, result) {
		if (err) return next(err);
		if (result)
		Product.deleteMany({ brand: ObjectId(req.params.id) }, (err, result) => {
			if (err) return next(err);
			Stock.deleteMany({ brand: ObjectId(req.params.id) }, (err, result) => {
				if (err) return next(err);
				res.status(200).json({ message: `brand deleted` });
			});
		});
	});
});

router.post('/brands/styles/find', FX.adminAuth, (req, res, next) => {
	var { length, start } = req.body;
	var sort = {};

	search_arr = ["styleCode"];
	sort_arr = ["_id", "styleCode"];
	query = {
		isArchive: false
	};

	var sort_key = sort_arr[parseInt(req.body["order[0][column]"])];
	var sort_val = req.body["order[0][dir]"] == "asc" ? 1 : -1;
	sort[sort_key] = sort_val;
	var limit = parseInt(length) > 0 ? parseInt(length) : '';

	if (req.body['search[value]']) {
		query["$or"] = [];
		search_arr.forEach(function (field) {
			var obj = {};
			obj[field] =
				{
					'$regex': req.body['search[value]'].replace(/([\.\(\)\\])/g,"\\$1"),
					'$options': 'i'
				}
			query["$or"].push(obj);
		});
	}

	var match = {
		$match: {
			...query,
			brand: ObjectId(req.query.brand)
		}
	};

	var group = {
		$group: {
			_id: "$styleCode",
			qty: {
				$sum: "$qty"
			}
		}
	};

	Product.aggregate([
		match,
		group
	], (err, result1) => {
		if (err) return next(err);
		Product.aggregate([
			match,
			group,
			{
				$sort: sort
			},
			{
				$skip: start * 1
			},
			{
				$limit: limit
			}
		], (err, result) => {
			if (err) return next(err);
			res.json({ recordsFiltered: result1.length, recordsTotal: result.length, data: result });
		});
	});

});

router.get('/brands/styles/sizes', FX.adminAuth, (req, res, next) => {
	var { brand, styleCode } = req.query;

	var match = {
		$match: {
			isArchive: false,
			styleCode,
			brand: ObjectId(brand)
		}
	};

	var group = {
		$group: {
			_id: "$size",
			qty: {
				$sum: "$qty"
			}
		}
	};

	Product.aggregate([
		match,
		group,
	], (err, result) => {
		if (err) return next(err);
		res.json({ result });
	});

});

module.exports = router;