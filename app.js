const express = require('express');
// const app = require('express')();
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const download = require('image-downloader'); // https://www.npmjs.com/package/image-downloader
const read = require('node-readability'); // https://www.npmjs.com/package/node-readability
const fs = require('fs');
const AdmZip = require('adm-zip'); // https://www.npmjs.com/package/adm-zip

//global variables
var manifest = '';
var spine = ''
var tocItem = ''
var tocPageItem = ''

server.listen(80);
app.use(express.static(__dirname + "/public"));



function makeCover(epubPath, epubDatas, epubPub, epubId) {
    let imgPath = epubPath + '\\images';
    if (!fs.existsSync(imgPath)) fs.mkdirSync(imgPath);
    let coverName = 'cover_' + epubId + '.png'
    let imgFilePath = imgPath + '\\' + coverName;
    //save img file
    return coverName;
}

function getWebPages(epubFilePath, epubDatas) {
    return new Promise((resolve, reject) => {
        dataLength = parseInt(epubDatas[0]) +1 // first element of epub_datas indicates number of meta fields
        epubUrls = epubDatas.slice(dataLength); // array of urls
        let epub = new AdmZip(epubFilePath); // open defined zip-file
        for (let i = 0; i < epubUrls.length; i++) {
            let url = epubUrls[i];
            let html, title;
            let idx = i;
            read(url, function (err, article, meta) {
                if (err) {
                    console.log('Error: could not get '+ url);
                    let msg = 'Error: could not get webpage '+ url;
                    io.sockets.emit('my_response', {
                        'data': msg
                    });
                    return;
                }
                manifest += `        <item id="s${idx+1}" href="content/s${idx+1}.xhtml" media-type="application/xhtml+xml"/>\n`
                spine += `<itemref idref="s${idx+1}" />\n`
                tocItem += `<navPoint class='section' id='s${idx+1}' playOrder='${idx+3}'>
                <navLabel><text>${title}</text></navLabel>
                <content src='content/s${idx+1}.xhtml'/>
                </navPoint>`
                tocPageItem += `<li><a href='s${idx+1}.xhtml'>${title}</a></li>`
                // Main Article
                console.log('received webpage: ' + url); 
                let msg = 'Received webpage: '+ url;
                io.sockets.emit('my_response', {
                    'data': msg
                });
                html = article.content; //cleaned content; todo: clean_html() for adding title and doctype
                epub.addFile(`OEBPS\\content\\s${idx+1}.xhtml`, Buffer.alloc(html.length, html));
                title = article.title;
                article.close();
                if (idx === epubUrls.length -1){ // last url is received
                    epub.writeZip(epubFilePath); //######################
                    console.log('All pages received');
                    resolve();
                }
            });
        }
    });
}

function makeEpub(epubPath, epubFilePath, epubDatas, epubId, epubPub, epubMod, coverFileName){
    //write mimetype
    let epub = new AdmZip(epubFilePath); // open defined zip-file
    epubTitle = epubDatas[1]
    epubAuthor = epubDatas[3]
    epubLan = epubDatas[4]
    let mimetype = 'application/epub+zip';
    epub.addFile(`mimetype`, Buffer.alloc(mimetype.length, mimetype));
    //write container.xml
    let container = `<?xml version='1.0' encoding='UTF-8' ?>
    <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
        <rootfiles>
            <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
        </rootfiles>
    </container>`
    epub.addFile(`META-INF\\container.xml`, Buffer.alloc(container.length, container));

    //write content.opf
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
                <item id="cover" href="content/cover.xhtml" media-type="application/xhtml+xml"/>
                <item id="cover-image" href="images/cover.png" media-type="image/png"/>
                <item id='ncx' media-type='application/x-dtbncx+xml' href='toc.ncx'/>
                <item id='toc' media-type='application/xhtml+xml' href='content/toc_page.xhtml'/>
                ${manifest}
                <item id='css' media-type='text/css' href='css/epub.css'/>
            </manifest>
            <spine toc="ncx">
                <itemref idref='cover' linear='yes' />
                <itemref idref='toc'/>
                ${spine}
            </spine>
            <guide>
                <reference type='toc' title='Contents' href='content/toc_page.xhtml'></reference>
            </guide>
        </package>`;
        epub.addFile(`OEBPS\\content.opf`, Buffer.alloc(contentOpf.length, contentOpf));
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
            <div class='cover'><img style='height: 100%;width: 100%;' src='../images/cover.png' alt='Cover' /></div>
        </div>
    </body>
    </html>`;
    // ### define toc after iteration of webpages to fill toc_items
    epub.addFile(`OEBPS\\content\\cover.xhtml`, Buffer.alloc(coverHtml.length, coverHtml));
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
        ${tocItem}
    </navMap>
    </ncx>`;
    epub.addFile(`OEBPS\\toc.ncx`, Buffer.alloc(toc.length, toc));
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
            ${tocPageItem}
            </ol>
        </body>
    </html>`
    epub.addFile(`OEBPS\\content\\toc_page.xhtml`, Buffer.alloc(tocPage.length, tocPage));
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
    epub.addFile(`OEBPS\\css\\epub.css`, Buffer.alloc(css.length, css));
    epub.addLocalFile(`${epubPath}\\Images\\${coverFileName}`, `OEBPS\\images`);

    epub.writeZip(epubFilePath); //######################

    // console.log('contentOpf: '+ contentOpf);

}


async function makeBook(datas) { //param: datas
    const stamp = new Date().toISOString().replace(/:|-|\.|T|Z/g, ''); //20181213223150036
    // let epubPath = __dirname + '\\temp' + stamp;
    let epubPath = __dirname + '\\temp';// only for testing
    if (!fs.existsSync(epubPath)) fs.mkdirSync(epubPath);
    // let epubFilePath = __dirname + '\\temp' + '\\ebook_' + stamp + '.epub';
    let epubFilePath = __dirname + '\\temp' + '\\ebook.zip'; //only for testing
    var epub = new AdmZip();
    epub.writeZip(epubFilePath); //make empty zip-file

    epubMod = stamp.slice(0, 12) // modification date (seconds)
    epubId = stamp // can be changed to e.g. ISBN
    epubPub = stamp.slice(0, 4) // publication year
    epubDatas = datas.split(',') //array
    // epubDatas[2] = '';

    if (!epubDatas[0].trim()) epubDatas[1] = 'Title';
    if (!epubDatas[1].trim()) epubDatas[2] = 'Subtitle';
    if (!epubDatas[2].trim()) epubDatas[3] = 'Author';
    if (!epubDatas[3].trim()) epubDatas[4] = 'en';
    console.log('epubDatas: '+epubDatas);

    //First make cover image
    // coverFileName = makeCover(epubPath, epubDatas, epubPub, epubId)
    coverFileName = 'cover.png';
    
    //Make epub file
    await getWebPages(epubFilePath, epubDatas);
    makeEpub(epubPath, epubFilePath, epubDatas, epubId, epubPub, epubMod, coverFileName)
    console.log('after await');
    let msg = 'Book is finished';
    io.sockets.emit('my_response', {
        'data': msg
    });

    // getWebPages(epubFilePath, epubDatas, epubId, epubPub, epubMod, coverFileName);


}

// make_book('4,tit, des, , lan, https://nl.wikipedia.org/wiki/Zijdevlinder, https://plato.stanford.edu/entries/adorno/');

io.on('connection', function (socket) {
// io.on('connection', onConnect)
// function onConnect(socket){
    socket.emit('news', {
        hello: 'world'
    });
    socket.on('my other event', function (data) {
        console.log(data);
    });
    socket.on('make_book', function (data) {
        console.log(data.data);
        socket.emit('my_response', {
            'data': 'Start making book'
        });
        makeBook(data.data);
        //start make book
        // zip_file = make_book(datas)
        // zip_file_path = 'temp/' + zip_file.toString();
        // socket.emit('my_response', {
        //     'data': 'Book is finished'
        // });
        // socket.emit('book_finished', {
        //     'data': zip_file_path,
        //     'count': 6
        // })
    });
});     