var expect = require('chai').expect;
var fs = require('fs');
var { S3 } = require('@aws-sdk/client-s3')

// Gathered from http://stackoverflow.com/questions/5827612/node-js-fs-readdir-recursive-directory-search
function walk (dir) {

	var results = [];
	var list = fs.readdirSync(dir);

	list.forEach(function (file) {

		file = dir + '/' + file;
		var stat = fs.statSync(file);

		if (stat && stat.isDirectory()) {
			results = results.concat(walk(file));
		}
		else {
			results.push(file);
		}
	});

	return results;
}

async function listKeys(prefix) {
	if (prefix.startsWith('bucket/') && process.env.USE_S3_BUCKET) {
		const s3 = new S3();
		const Bucket = process.env.USE_S3_BUCKET;
		const Prefix = prefix.slice(7);

		let keys = [];
		let ContinuationToken;
		do {
			const data = await s3.listObjectsV2({ Bucket, Prefix, ContinuationToken });
			if (data.Contents) {
				keys = keys.concat(data.Contents.map((item) => item.Key));
			}
			ContinuationToken = data.NextContinuationToken;
		} while (ContinuationToken);
		return keys;
	} else {
		return walk(__dirname + '/local/' + prefix);
	}
}

function check(prefix, length) {
	it(`${prefix} should have ${length} items`, async function () {
		this.timeout(10000);
		const keys = await listKeys(prefix);
		expect(keys).to.have.length(length);
	});
}

describe('S3', function () {
	check('bucket/first', 159);
	check('bucket/second', 158);
	check('bucket/third', 98);
	check('bucket/fourth', 317);
	check('bucket/fifth', 2);
	check('bucket/copies', 159);
	check('bucket/first/otters/updated', 0);

	check('download/backup', 317);
	check('download/fourth', 158);
	check('download/fifth', 60);
});
