'use strict';
var fs = require('fs-extra');
var archiver = require('archiver');

class ZipAFolder {
    static async zip(srcFolder, zipFilePath) {
        return new Promise((resolve, reject) => {
            ZipAFolder.zipFolder(srcFolder, zipFilePath, err => {
                if (err) {
                    reject(err);
                }
                resolve();
            });
        });
    }

    static zipFolder(srcFolder, zipFilePath, callback) {
        fs.access(srcFolder, fs.constants.F_OK, (notExistingError) => {
            if (notExistingError) {
                callback(notExistingError);
            }
            var output = fs.createWriteStream(zipFilePath);
            var zipArchive = archiver('zip');
            output.on('close', function() {
                callback();
            });
            output.on('end', function() {
                console.log('Data has been drained');
              });
               
              // good practice to catch warnings (ie stat failures and other non-blocking errors)
            zipArchive.on('warning', function(err) {
                if (err.code === 'ENOENT') {
                  // log warning
                } else {
                  // throw error
                  throw err;
                }
            });              
            zipArchive.on('error', function(err) {
                throw err;
            });
            zipArchive.pipe(output);
            // ### FS change: mimetype has to be the first file in the archive and no compression ###
			zipArchive.append('application/epub+zip', { name: 'mimetype', store: true});
            zipArchive.directory(srcFolder, false);
            zipArchive.finalize();
			// ### ###
        });
    }
}

module.exports = ZipAFolder;
