const fs = require('fs');
const path = require('path');
const webfontsGenerator = require('webfonts-generator');

const rootPath = './cartridges/app_custom_chalhoub/cartridge';

const filePath = `${rootPath}/client/default/icons`;

const data = fs.readdirSync(path.join(__dirname, '..', filePath)).map(file => {
  return `${filePath}/${file}`;
});

try {
webfontsGenerator({
  files: data,
  fileName: 'iconfont',
  dest: `${rootPath}/static/default/fonts/icons`,
  types: ['woff', 'woff2'],
  cssDest: `${rootPath}/client/default/scss/ELE-util/_icons.scss`,
  cssTemplate: path.join(__dirname, 'buildIconsTemplate.hbs'),
  html: true,
  templateOptions: {
    classPrefix: 'icon-'
  }
}, function(error) {
  if (error) {
    console.log('Failed to build icons!', error);
    console.log('in the error state', error);
  } else {
    console.log('Icons built...');
  }
})
} catch (e) {
  console.log(e)
}
