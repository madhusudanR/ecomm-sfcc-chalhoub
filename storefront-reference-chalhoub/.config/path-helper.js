const cwd = process.cwd();
const path = require('path');
const glob = require('glob');

var createJsPath = function (packagePath) {
    var result = {};

    var jsFiles = glob.sync(`${packagePath}/cartridge/client/**/js/*.js`);

    jsFiles.forEach(function (filePath) {
        let location = path.relative(path.join(cwd, `${packagePath}/cartridge/client`), filePath);
            location = location.substr(0, location.length - 3);
        result[location] = filePath;
    });

    return result;
};

var createScssPath = function (packagePath) {
    var result = {};
    
	var scssFiles = glob.sync(`${packagePath}/cartridge/client/**/scss/**/*.scss`);

	scssFiles.forEach(filePath => {
		var name = path.basename(filePath, '.scss');
		if (name.indexOf('_') !== 0) {
			let location = path.relative(path.join(cwd, `${packagePath}/cartridge/client`), filePath);
				location = location.substr(0, location.length - 5).replace('scss', 'css');
			result[location] = filePath;
		}
	});

    return result;
};

module.exports = {
    createJsPath,
    createScssPath
};