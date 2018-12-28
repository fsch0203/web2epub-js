const express = require('express'); //https://expressjs.com/
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server); //https://socket.io/
const download = require('image-downloader'); // https://www.npmjs.com/package/image-downloader
const read = require('node-readability'); // https://www.npmjs.com/package/node-readability
const fs = require('fs-extra'); //https://www.npmjs.com/package/fs-extra
const path = require('path');
const zipFolder = require(path.join(__dirname, 'zip-a-folder-fs')); // https://www.npmjs.com/package/zip-a-folder
// const zipFolder = require('zip-a-folder'); // https://www.npmjs.com/package/zip-a-folder
const JSSoup = require('jssoup').default; // https://www.npmjs.com/package/jssoup

server.listen(3002);
app.use(express.static(path.join(__dirname, 'public')));


function makeCover(epubPath, epubDatas, epubId) {
    return new Promise((resolve, reject) => { //promise, so we know when all files are saved
        const epubPub = epubId.slice(0, 4) // publication year
        const imgPath = path.join(epubPath, 'OEBPS', 'images');
        const coverName = `cover.svg`;
        const imgFilePath = path.join(imgPath, coverName);
        const width = 800
        const height = parseInt(width * 1.4);
        const title = epubDatas[1];
        const description = epubDatas[2];
        const author = epubDatas[3];
        const textBgColor = epubDatas[4];
        const margin = 50; //of block
        const padding = 30; //in block
        const bh = 3; //block heigth ratio
        const topBlock = parseInt(0.2 * height);
        const fontsizeTit = Math.min(parseInt(1.5 * (width - margin) / title.length), 80);
        const fontsizeDes = parseInt(Math.min(1.5 * (width - margin) / description.length, 0.8 * fontsizeTit));
        const fontsizeAut = 50;
        const fontsizePub = 20;
        const fontstyleTit = 'verdana';
        const fontstyleDes = 'verdana';
        const fontstyleAut = 'arial';
        const fontcolorTit = '#ffffff';
        const fontcolorDes = 'black';
        const fontcolorAut = '#333';
        const closingText = `Web2Epub ${epubPub}`;
        const blockHeight = Math.max(parseInt(bh * (fontsizeTit + fontsizeDes)), 360);

        let svg = `<svg  style='stroke-width: 0px; background-color: white;' xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}">\n`;
        svg += `<rect x="${margin}" y="${topBlock}" width="${width-(2*margin)}" height="${blockHeight}" style="fill:${textBgColor};" />\n`;
        svg += `<text x="${width/2}" y="${topBlock+blockHeight/4+fontsizeTit/2}" fill="${fontcolorTit}" text-anchor="middle" font-size="${fontsizeTit}" font-family="${fontstyleTit}" font-weight="bold" >${title}</text>\n`;
        svg += `<line x1="${margin+padding}" y1="${topBlock+(blockHeight)/2}" x2="${width-margin-padding}" y2="${topBlock+(blockHeight)/2}" style="stroke:${fontcolorTit};stroke-width:2" />`
        svg += `<text x="${width/2}" y="${topBlock+3*blockHeight/4}" fill="${fontcolorDes}" text-anchor="middle" font-size="${fontsizeTit}" font-family="${fontstyleDes}" >${description}</text>\n`;
        svg += `<text x="${width-margin}" y="${3*height/4}" fill="${fontcolorAut}" text-anchor="end" font-size="${fontsizeAut}" font-family="${fontstyleAut}" >${author}</text>\n`;
        svg += `<text x="${width/2}" y="${0.94*height}" fill="${fontcolorAut}" text-anchor="middle" font-size="${fontsizePub}" font-family="${fontstyleAut}" >${closingText}</text>\n`;
        svg += `</svg>`;

        fs.writeFile(imgFilePath, svg, function (err) {
            if (err) console.log(err);
            resolve();
        });
    });
}

async function getImages(html, idx, epubPath, epubGlobals, socketID) { //idx is index of webpage
    let soup = new JSSoup(html);
    let imgPath = path.join(epubPath, 'OEBPS', 'images');
    let imgs = soup.findAll('img');
    for (let i = 0; i < imgs.length; i++) {
        const imgsrc = imgs[i].attrs.src; //link to sourcefile
        // console.log('imgsrc: '+ imgsrc);
        let ext = imgsrc.slice(-3).toLowerCase();
        if (ext === 'png' || ext === 'jpg') {
            let imgName = `img_${idx+1}_${i+1}.${ext}`;
            let imgFilePath = path.join(imgPath, imgName);
            try {
                await download.image({
                    url: imgsrc,
                    dest: imgFilePath
                });
                if (ext === 'jpg') { //add image in manifest
                    epubGlobals.manifest += `        <item id="${imgName}" href="images/${imgName}" media-type="image/jpeg"/>\n`
                } else {
                    epubGlobals.manifest += `        <item id="${imgName}" href="images/${imgName}" media-type="image/png"/>\n`
                }
                // imgs[i].attrs.src = path.join('..', 'images', imgName); // make new src-attribute in img-tag
                imgs[i].attrs.src = '../images/' + imgName; // make new src-attribute in img-tag
                let msg = 'Downloaded image : ' + imgName;
                io.sockets.connected[socketID].emit('my_response', {
                    'data': msg
                });
            } catch (e) {
                console.error(e)
                let msg = 'Error: could not download image : ' + imgName;
                io.sockets.connected[socketID].emit('my_response', {
                    'data': msg
                });
            }
        } else {
            console.log('Error getting image: ' + imgsrc);
        }
    }
    return [soup, epubGlobals];
}

function readUrl(url, idx, epubPath, epubGlobals, socketID) {
    return new Promise((resolve, reject) => {
        read(url, async function (err, article, meta) {
            if (err) {
                console.log('Error: could not get ' + url);
                let msg = 'Error: could not get webpage ' + url;
                io.sockets.connected[socketID].emit('my_response', {
                    'data': msg
                });
                resolve();
                return;
            }
            epubGlobals.manifest += `        <item id="s${idx+1}" href="content/s${idx+1}.xhtml" media-type="application/xhtml+xml"/>\n`;
            epubGlobals.spine += `<itemref idref="s${idx+1}" />\n`;
            epubGlobals.tocItem += `<navPoint class='section' id='s${idx+1}' playOrder='${idx+3}'>
            <navLabel><text>${article.title}</text></navLabel>
            <content src='content/s${idx+1}.xhtml'/>
            </navPoint>`;
            epubGlobals.tocPageItem += `<li><a href='s${idx+1}.xhtml'>${article.title}</a></li>`;
            console.log('received webpage: ' + url);
            let msg = 'Received webpage: ' + url;
            io.sockets.connected[socketID].emit('my_response', {
                'data': msg
            });

            let header = `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd" ><html xmlns="http://www.w3.org/1999/xhtml"><head><title>${article.title}</title><link href="../css/epub.css" rel="stylesheet" type="text/css" /></head><body><h1>${article.title}</h1>`;
            let footer = `</body></html> `;
            let html = article.content; //cleaned content; todo: clean_html() for adding title and doctype
            getImages(html, idx, epubPath, epubGlobals, socketID).catch((err) => {
                throw new Error('Error getting images: ' + err);
            }).then(array => {
                html = array[0].toString();
                html = html.replace(/srcset="(.*?)"/gi, '');
                html = html.replace(/data-file-width="(.*?)"/gi, '');
                html = html.replace(/data-file-height="(.*?)"/gi, '');
                html = html.replace(/clear="(.*?)"/gi, '');
                html = html.replace(/role="(.*?)"/gi, '');
                html = `${header}${html}${footer}`; //cleaned content; todo: clean_html() for adding title and doctype
                epubGlobals = array[1];
                let urlFilePath = path.join(epubPath, 'OEBPS', 'content', `s${idx+1}.xhtml`);
                fs.writeFile(urlFilePath, html, function (err) {
                    if (err) console.log(err);
                });
                article.close();
                resolve(epubGlobals);
            });
        });
    });
}

async function getWebPages(epubPath, epubUrls, socketID) {
    var epubGlobals = {
        manifest: '',
        spine: '',
        tocItem: '',
        tocPageItem: ''
    };
    for (let i = 0; i < epubUrls.length; i++) {
        let url = epubUrls[i];
        url = (url.slice(-1) === '/') ? url.slice(0, -1) : url;
        epubGlobals = await readUrl(url, i, epubPath, epubGlobals, socketID)
            .catch((err) => console.log('Error reading url: ' + err));;
    }
    console.log('All pages received for socketID: ' + socketID);
    return epubGlobals;
}

function makeEpub(epubPath, epubDatas, epubId, epubPub, epubMod, epubGlobals) {
    // writes all non-content files to disk
    return new Promise((resolve, reject) => { //promise, so we know when all files are saved
        epubTitle = epubDatas[1]
        epubAuthor = epubDatas[3]
        epubLan = epubDatas[4]
        let container = `<?xml version='1.0' encoding='UTF-8' ?>
        <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
            <rootfiles>
                <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
            </rootfiles>
        </container>`
        const promiseContainer = new Promise((res, rej) =>
            fs.writeFile(path.join(epubPath, 'META-INF', 'container.xml'), container, function (err) {
                if (err) console.log(err);
                res('promiseContainer');
            })
        );
        let contentOpf = `<?xml version='1.0' encoding='utf-8'?>
        <package xmlns='http://www.idpf.org/2007/opf' version='2.0' unique-identifier='BookId'>
            <metadata xmlns:dc='http://purl.org/dc/elements/1.1/' xmlns:opf='http://www.idpf.org/2007/opf'>
                <dc:title>${epubTitle}</dc:title>
                <dc:creator opf:role='aut' opf:file-as=''>${epubAuthor}</dc:creator>
                <dc:identifier id='BookId' opf:scheme='URI'>${epubId}</dc:identifier>
                <dc:language>${epubLan}</dc:language>
                <dc:description>Description</dc:description>
                <dc:date opf:event='publication'>${epubPub}</dc:date>
                <dc:date opf:event='modification'>${epubMod}</dc:date>
                <dc:subject>Unknown</dc:subject>
                <meta name="cover" content="cover-image" />
                </metadata>
                <manifest>
                    <item id="cover-image" href="images/cover.svg" media-type="image/svg+xml"/>
                    <item id="cover" href="content/cover.xhtml" media-type="application/xhtml+xml"/>
                    <item id='ncx' media-type='application/x-dtbncx+xml' href='toc.ncx'/>
                    <item id='toc' media-type='application/xhtml+xml' href='content/toc_page.xhtml'/>
                    ${epubGlobals.manifest}
                    <item id='css' media-type='text/css' href='css/epub.css'/>
                </manifest>
                <spine toc="ncx">
                    <itemref idref='cover' linear='yes' />
                    <itemref idref='toc'/>
                    ${epubGlobals.spine}
                </spine>
                <guide>
                    <reference type='toc' title='Contents' href='content/toc_page.xhtml'></reference>
                </guide>
            </package>`;
        const promiseContentOpf = new Promise((res, rej) =>
            fs.writeFile(path.join(epubPath, 'OEBPS', 'content.opf'), contentOpf, function (err) {
                if (err) console.log(err);
                res('promiseContentOpf');
            })
        );
        let coverHtml = `<?xml version='1.0' encoding='utf-8'?>
        <!DOCTYPE html PUBLIC '-//W3C//DTD XHTML 1.1//EN' 'http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd' >
        <html xmlns='http://www.w3.org/1999/xhtml' xml:lang='en'>
        <head>
            <title>${epubTitle}</title>
            <style type='text/css'>
                body { margin: 0; padding: 0; text-align: center; }
                .cover { margin: 0; padding: 0; }
                img { margin: 0; padding: 0; height: 100%; }
            </style>
        </head>
        <body>
            <div id="cover-image">
                <div class='cover'><img style='height: 100%;width: 100%;' src='../images/cover.svg' alt='${epubTitle}'/></div>
            </div>
        </body>
        </html>`;
        const promiseCoverXhtml = new Promise((res, rej) =>
            fs.writeFile(path.join(epubPath, 'OEBPS', 'content', 'cover.xhtml'), coverHtml, function (err) {
                if (err) console.log(err);
                res('promiseCoverXhtml');
            })
        );
        let toc = `<?xml version='1.0' encoding='UTF-8'?>
        <!DOCTYPE ncx PUBLIC '-//NISO//DTD ncx 2005-1//EN' 'http://www.daisy.org/z3986/2005/ncx-2005-1.dtd'>
        <ncx xmlns='http://www.daisy.org/z3986/2005/ncx/'>
        <head>
            <meta name='dtb:uid' content='${epubId}'/>
            <meta name='dtb:depth' content='1'/>
            <meta name='dtb:totalPageCount' content='0'/>
            <meta name='dtb:maxPageNumber' content='0'/>
        </head>
        <docTitle><text>${epubTitle}</text></docTitle>
        <docAuthor><text>${epubAuthor}</text></docAuthor>
        <navMap>
            <navPoint id='cover' playOrder='1'>
                <navLabel><text>Cover</text></navLabel>
                <content src='content/cover.xhtml'/>
            </navPoint>
            <navPoint class='toc_page' id='toc_page' playOrder='2'>
                <navLabel><text>Table of contents</text></navLabel>
                <content src='content/toc_page.xhtml'/>
            </navPoint>
            ${epubGlobals.tocItem}
        </navMap>
        </ncx>`;
        const promiseToc = new Promise((res, rej) =>
            fs.writeFile(path.join(epubPath, 'OEBPS', 'toc.ncx'), toc, function (err) {
                if (err) console.log(err);
                res('promiseToc');
            })
        );
        let tocPage = `<?xml version='1.0' encoding='utf-8'?>
        <!DOCTYPE html PUBLIC '-//W3C//DTD XHTML 1.1//EN' 'http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd' >
        <html xmlns='http://www.w3.org/1999/xhtml'>
            <head>
                <title>${epubTitle}</title>
                <link rel='stylesheet' type='text/css' href='../css/epub.css' />
            </head>
            <body>
                <h2>Table Of Contents</h2>
                <ol class="toc_page-items">
                ${epubGlobals.tocPageItem}
                </ol>
            </body>
        </html>`
        const promiseTocPage = new Promise((res, rej) =>
            fs.writeFile(path.join(epubPath, 'OEBPS', 'content', 'toc_page.xhtml'), tocPage, function (err) {
                if (err) console.log(err);
                res('promiseTocPage');
            })
        );
        let css = `body {
            font-size: medium;
        }
        blockquote {
            font-style: italic;
            border-left: 3px solid black;
            margin-left: 0px;
            padding-left: 10px;
        }
        code {
            font-family: monospace;
            word-wrap: break-word;
        }
        p {
            text-indent: 1em;
        }
        pre > code {
            line-height: 1.5;
        }
        pre {
            border-left: 3px solid black;
            background-color: rgb(240, 240, 240);
            padding-left: 10px;
            text-align: left;
            white-space: pre-wrap;
            font-size: 75%;
        }`
        const promiseCss = new Promise((res, rej) =>
            fs.writeFile(path.join(epubPath, 'OEBPS', 'css', 'epub.css'), css, function (err) {
                if (err) console.log(err);
                res('promiseCss');
            })
        );
        Promise.all([promiseMimetype, promiseContainer, promiseContentOpf, promiseToc, promiseTocPage,
            promiseCoverXhtml, promiseCss
        ]).then(values => { //all files are saved
            // console.log('All non-content files are saved: ' + values)
            resolve(); //resolves promise of function makeEpub
        });
    });
}

async function makeBook(datas, socketID) { // datas is string with metafields and urls
    // first we make the folder structure for the ebook in unique folder in ./temp
    // then we make cover, get content from webpages and make epub files
    // then we zip the filestructure
    // and download the epub-file to the user
    manifest = spine = tocItem = tocPageItem = ''; // clear gobal variables
    const stamp = new Date().toISOString().replace(/:|-|\.|T|Z/g, ''); //e.g. 20181213223150036
    const epubFileName = 'ebook_' + stamp + '.epub'; // todo: change in .epub
    const epubfiles = path.join(__dirname, 'epubfiles'); //all final epubfiles in this folder
    if (!fs.existsSync(epubfiles)) fs.mkdirSync(epubfiles);
    const tempPath = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempPath)) fs.mkdirSync(tempPath);
    const tempstamp = 'temp_' + stamp; //unique name
    const epubPath = path.join(tempPath, tempstamp); //unique temp-folder for each book
    if (!fs.existsSync(epubPath)) fs.mkdirSync(epubPath);
    let xPath = path.join(epubPath, 'OEBPS');
    if (!fs.existsSync(xPath)) fs.mkdirSync(xPath);
    xPath = path.join(epubPath, 'OEBPS', 'content');
    if (!fs.existsSync(xPath)) fs.mkdirSync(xPath);
    xPath = path.join(epubPath, 'OEBPS', 'images');
    if (!fs.existsSync(xPath)) fs.mkdirSync(xPath);
    xPath = path.join(epubPath, 'OEBPS', 'css');
    if (!fs.existsSync(xPath)) fs.mkdirSync(xPath);
    xPath = path.join(epubPath, 'META-INF');
    if (!fs.existsSync(xPath)) fs.mkdirSync(xPath);
    const epubFilePath = path.join(epubfiles, epubFileName);

    const d = new Date();
    const epubMod = d.toISOString(); // modification date (seconds)
    const epubId = stamp // can be changed to e.g. ISBN
    const epubPub = parseInt(stamp.slice(0, 4)); // publication year
    let epubDatas = datas.split(','); //array of metafields and urls
    // meta fields
    if (!epubDatas[1].trim()) epubDatas[1] = 'Title';
    if (!epubDatas[2].trim()) epubDatas[2] = 'Subtitle';
    if (!epubDatas[3].trim()) epubDatas[3] = 'Author';
    if (!epubDatas[4].trim()) epubDatas[4] = 'en'; // language
    if (!epubDatas[5].trim()) epubDatas[5] = '#008080'; // color cover
    const metaLength = parseInt(epubDatas[0]); // first element of epub_datas indicates number of meta fields
    const epubUrls = epubDatas.slice(metaLength + 1); // array of urls

    //Make cover
    await makeCover(epubPath, epubDatas, epubId);

    // Get all webpages
    epubGlobals = await getWebPages(epubPath, epubUrls, socketID) // epubGlobals = {manifest: '', spine: '', tocItem: '', tocPageItem: ''};
        .catch((err) => console.log('Error getting webpages'));

    // then make epub-files
    await makeEpub(epubPath, epubDatas, epubId, epubPub, epubMod, epubGlobals)
        .catch((err) => console.log('Error making Epub: ' + err));

    // convert to epub-format
    await zipFolder.zip(epubPath, path.join(epubfiles, epubFileName))
        // await zipFolder(epubPath, path.join(epubfiles, epubFileName))
        .catch((err) => console.log('Error making zipfolder'));

    // finish job
    fs.remove(epubPath, err => {
        if (err) return console.error('Cannot remove epubPath: ' + err);
    });
    console.log('Book is finished for socketID: ' + socketID);
    let msg = 'Book is finished';
    io.sockets.connected[socketID].emit('my_response', {
        'data': msg
    });

    // download
    let downloadPath = '/download' + Math.random().toString().slice(2); //unique secret path
    app.get(downloadPath, function (req, res) {
        // var file = epubFilePath;
        res.download(epubFilePath); // Uses module download
    });
    io.sockets.connected[socketID].emit('book_finished', {
        'data': downloadPath
    });
}

// make_book('5,tit,des,,lan,#123456,https://nl.wikipedia.org/wiki/Zijdevlinder, https://plato.stanford.edu/entries/adorno/');

io.on('connection', function (socket) {
    let socketID = socket.id; // id of connected user
    socket.emit('my_response', {
        'data': 'Connected'
    });
    socket.on('make_book', function (data) {
        console.log(`Request to make book for socketID: ${socketID} -> ${data.data}`);
        socket.emit('my_response', {
            'data': 'Start making book'
        });
        makeBook(data.data, socketID);
    });
});