// const fs = require('fs');
const path = require('path');
const fs = require('fs');

function makeCover(epubPath, epubDatas, epubPub, epubId) {
    let imgPath = path.join(epubPath, 'OEBPS', 'images');
    let coverName = `cover_${epubId}.png`;
    let imgFilePath = path.join(imgPath, coverName);
    const width = 800
    const height = parseInt(width * 1.4);
    let title = epubDatas[0];
    let description = epubDatas[1];
    let author = epubDatas[2];
    let textBgColor = epubDatas[4];
    let margin = 50; //of block
    let padding = 30; //in block
    let bh = 4; //block heigth ratio
    let topBlock = parseInt(0.2 * height);
    let fontsizeTit = Math.min(parseInt(1.5 * (width - margin) / title.length), 80);
    let fontsizeDes = parseInt(Math.min(1.5 * (width - margin) / description.length, 0.8 * fontsizeTit));
    let fontsizeAut = 50;
    let fontsizePub = 20;
    let fontstyleTit = 'verdana';
    let fontstyleDes = 'verdana';
    let fontstyleAut = 'arial';
    let fontcolorTit = '#ffffff';
    let fontcolorDes = 'black';
    let fontcolorAut = '#333';
    let closingText = `Web2Epub ${epubPub}`;

    // colored block
    let blockHeight = Math.max(parseInt(bh * (fontsizeTit + fontsizeDes)), 360);
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
        width="${width}" height="${height}">\n`;
    svg += `<rect x="${margin}" y="${topBlock}" width="${width-(2*margin)}" height="${blockHeight}" 
        style="fill:${textBgColor};" />\n`;
    svg += `<text x="${width/2}" y="${topBlock+blockHeight/4+fontsizeTit/2}" fill="${fontcolorTit}" 
        text-anchor="middle" font-size="${fontsizeTit}" 
        font-family="${fontstyleTit}" font-weight="bold" >${title}</text>\n`;
    svg += `<line x1="${margin+padding}" y1="${topBlock+(blockHeight)/2}" x2="${width-margin-padding}" 
        y2="${topBlock+(blockHeight)/2}" style="stroke:${fontcolorTit};stroke-width:2" />`
    svg += `<text x="${width/2}" y="${topBlock+3*blockHeight/4}" fill="${fontcolorDes}" 
        text-anchor="middle" font-size="${fontsizeTit}" 
        font-family="${fontstyleDes}" >${description}</text>\n`;
    svg += `<text x="${width-margin}" y="${3*height/4}" fill="${fontcolorAut}" 
        text-anchor="end" font-size="${fontsizeAut}" 
        font-family="${fontstyleAut}" >${author}</text>\n`;
    svg += `<text x="${width/2}" y="${0.9*height}" fill="${fontcolorAut}" 
        text-anchor="middle" font-size="${fontsizePub}" 
        font-family="${fontstyleAut}" >${closingText}</text>\n`;
    svg += `</svg>`;

    fs.writeFile(path.join(__dirname, 'test.svg'), svg, function (err) {
        if (err) console.log(err);
    });

    // create svg.js instance
    
    // use svg.js as normal
    
    // get your svg as string
    // or
    // console.log(draw.node.outerHTML)
    return coverName;
}

let epubDatas = ['Titel en dit is een lange', 'Description', 'Author', 'en', '#00d4b3', 'url'];
let epubPub = '2018';
makeCover(__dirname, epubDatas, epubPub, '123');