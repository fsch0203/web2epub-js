var AdmZip = require('adm-zip');
var zip = new AdmZip();
let zipFilePath = __dirname + '\\temp\\ebook_.zip';

var content = "inner content of the file";
zip.addFile("folder\\test.txt", Buffer.alloc(content.length, content)   );
zip.addFile("folder\\test2.txt", Buffer.alloc(content.length, content));
zip.addLocalFile("cover.png", 'folder');

zip.writeZip(zipFilePath);
