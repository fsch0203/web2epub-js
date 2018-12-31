const appVersion = '0.2.0';

var socket = io('ws://localhost:3002', {transports: ['websocket']});
// var socket = io();
socket.on('news', function (data) {
    console.log(data);
    socket.emit('my other event', {
        my: 'data'
    });
});
var canvas = document.getElementById('memecanvas');
console.log('start index.js');

var memeWidth = 800;
var memeHeight = 1.5*memeWidth;
ctx = canvas.getContext('2d');
canvas.width = memeWidth;
canvas.height = memeHeight;
// var coverImg = $('#coverImage')[0];

function drawMeme() {
    const coverImg = new Image;
    coverImg.src = 'cover.png';
    // console.log('new image');
    let padding = 40;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(coverImg, 0, 0, memeWidth, memeHeight);
    ctx.fillStyle = $('#color-input').val();
    ctx.fillRect(padding, 0.1*memeHeight, memeWidth-(2*padding), 0.65*memeHeight);
    ctx.fillStyle = 'white';
    ctx.fillRect(2*padding, 0.55*memeHeight, memeWidth-(4*padding), 4);//horizontal line
    // ctx.font = 'bold 40pt verdana';
    ctx.font = '70pt verdana';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    wrapText(ctx, $('#tit').val(), memeWidth/2, 0.28*memeHeight, memeWidth-(2.2*padding), 120, false);//title
    ctx.font = '40pt verdana';
    ctx.fillStyle = 'black';
    wrapText(ctx, $('#des').val(), memeWidth/2, 0.62*memeHeight, memeWidth-(2.2*padding), 70, false);//subtitle
    wrapText(ctx, $('#aut').val(), memeWidth/2, 0.82*memeHeight, memeWidth-(2.2*padding), 70, false);//author
    ctx.font = '16pt verdana';
    wrapText(ctx, 'web2epub.com - 2018', memeWidth/2, 0.95*memeHeight, memeWidth-(2.2*padding), 50, false);//web2epub
}

function wrapText(context, text, x, y, maxWidth, lineHeight, fromBottom) {
    var pushMethod = (fromBottom) ? 'unshift' : 'push';
    lineHeight = (fromBottom) ? -lineHeight : lineHeight;
    var lines = [];
    var y = y;
    var line = '';
    var words = text.split(' ');
    for (var n = 0; n < words.length; n++) {
        var testLine = line + ' ' + words[n];
        var metrics = context.measureText(testLine);
        var testWidth = metrics.width;
        if (testWidth > maxWidth) {
            lines[pushMethod](line);
            line = words[n] + ' ';
        } else {
            line = testLine;
        }
    }
    lines[pushMethod](line);
    let s = lines.length -1;
    let top = y - (s*lineHeight/2);
    for (var k in lines) {
        context.fillText(lines[k], x, top + lineHeight * k);
    }
}

var editableList = Sortable.create(editable, {
    group: "urls",
    animation: 150,
    filter: '.js-remove',
    onFilter: function (evt) {
        evt.item.parentNode.removeChild(evt.item);
        let selurls = $('li').children('input').map(function () {
            return $(this).val();
        }).get(); //get array of values of all inputs in list
        localStorage.setItem('selurls', selurls.toString());
    },
    onUpdate: function () { //user has changed order in list
        let selurls = $('li').children('input').map(function () {
            return $(this).val();
        }).get(); //get array of values of all inputs in list
        localStorage.setItem('selurls', selurls.toString());
    }
});

$('.meta').change(function (event) { //one of the meta input fields is changed
    var metas = $('.meta').map(function () {
        return $(this).val();
    }).get();
    localStorage.setItem('metas', metas.toString());
});

if (localStorage.metas) { //fill list with urls in localstorage
    var metas = localStorage.metas.split(","); //array of earlier given meta-inputs
    $('#tit').val(metas[0]);
    $('#des').val(metas[1]);
    $('#aut').val(metas[2]);
    // $('#lan').val(metas[3]);
    $('#color-input').val(metas[3]);
} else {
    $('#color-input').val('#2196F3');
}

if (localStorage.selurls) { //fill list with urls in localstorage
    var selurls = localStorage.selurls.split(","); //array of earlier selected urls
    for (i in selurls) {
        addurltolist(selurls[i]);
    }
}

function storeSelection(elem, str) {
    var sel;
    if (localStorage.getItem(str)) { // there are earlier selected urls
        sel = localStorage.getItem(str).split(","); // set in array
        if (sel.indexOf(elem) < 0) { //if not already existing
            sel.push(elem); //add to array
        }
    } else { //no earlier selected countries
        sel = [elem];
    }
    localStorage.setItem(str, sel.toString());
}

function addurltolist(url) {
    let length = $("#editable li").length
    let elem = '<li class="w3-display-container"><input name="url' + length + '" value="' + url +
        '" type="url" class="w3-border-0 urls">' +
        '<span class="js-remove w3-button w3-transparent w3-display-right">&times;</span></li>';
    // console.log('elem: ' + elem)
    $('#editable').append(elem);
    storeSelection(url, "selurls");
}

function validateForm() {
    let length = document.getElementById("editable").getElementsByTagName("li").length;
    if (length < 1) {
        Ply.dialog("alert", {
            title: "Cannot make book",
            text: "Please give at least 1 webpage url"
        });
        return false;
    } else {
        return true;
    }
}

window.onbeforeunload = function () {
    window.scrollTo(0, 0); //scroll to top
}

function isUrl(s) { //check if string is correct url
    var regexp = /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
    return regexp.test(s);
}

$(document).ready(function () {
    // namespace = '/test';
    namespace = '';
    var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port + namespace);
    // console.log('socket: '+ location.protocol + '//' + document.domain + ':' + location.port + namespace);
    $("#popup01").hide();
    $(document).keydown(function(e){
        var code = e.keyCode || e.which;
        if (code === 27) $("#popup01").hide();
    });
    $('#about_btn').on('click', function () {
        var d = new Date();
        var yyyy = d.getFullYear();
        var hd = 'About';
        var msg = `<h2>Web2epub</h2>
        <p>Version: ${appVersion}</p>
        <p>Author: Frans Schrijver</p>
        <p>Licence: Copyright ${yyyy} MIT</p>
        <p><a href='https://www.web2epub.com' target='_blank'>www.web2epub.com</a></p>
        <p>Web2epub uses the package node-readability (which is based on arc90's readability project) to cleanup the webpage to get a better view. </p>
        `;
        $("#popupheader").html(hd);
        $("#popupmessage").html(msg);
        $("#popup_ok").val('Close');
        $("#popup_textarea, #popup_cancel").hide();
        $("#popup_ok").show();
        $("#popup01").show();
        // $("#popup01").fadeIn();
    });
    $('#help_btn').on('click', function () {
        var hd = 'Help web2epub';
        var msg = `
        <p>Web2epub is a simple web-application to make ebooks from one or more webpages.</p>
        <h3>How to use</h3>
        <p>Just fill in the fields for the title, subtitle and author and choose a color for the front. Then paste one or more weblinks (urls) and you're ready to go. Every webpage will be a chapter in the book. You can change the order with drag&drop.</p>
        <h3>Usecases</h3>
        <p>Epub is a great format for offline reading. Not just books but any document. It's supported by all sorts of devices (e-reader, computer, tablet, smartphone, etc.). In contrast to pdf the text in the Epub format is reflowable and easy to read on small devices.</p>
        <p>Some examples</p>
        <li>Delayed reading: save that attractive website and read it when you have time.</li> 
        <li>Web2epub is useful to make books from articles of wikipedia or other information websites. </li>
        <li>Great for students and scholars to collect literature.</li>
        <li>Make your own travelguide based on websites of your destination.</li>
        <li>Make your own cookbook based on recipes on websites.</li>
        <li>Etcetera...</li>
        <li>Nothing in the cloud: you save the information on your own device.</li> 
        <br/>
        <h3>Tips</h3>
        <li><a href='https://calibre-ebook.com/' target='_blank'>Calibre</a> is a great (and free) program to manage all your epub-files. You can search, view, edit, convert and backup your files and make the connection to your e-reader.</li>
        <li>Calibre also has a nice (standalone) reader for your books on your computer. In Windows: link your .epub-files to c:\\Program Files\\Calibre2\\ebook-viewer.exe (right click the epub-file and choose 'open with..'). </li>
        <li><a href='https://play.google.com/store/apps/details?id=com.faultexception.reader&hl=en_US' target='_blank'>Lithium</a> is an excellent (and free) epub-reader for your smartphone or tablet</li> 
        <li>To get the links to webpages it's sometimes attractive to use <a href='https://chrome.google.com/webstore/detail/link-klipper-extract-all/fahollcgofmpnehocdgofnhkkchiekoo' target='_blank'>Link Klipper</a>. It's a chrome extension to extract unique links on a specific web page</li>
        <br/>
        `;
        // showAbout(hd,msg);
        $("#popup_ok").val('Close');
        $("#popupheader").html(hd);
        $("#popupmessage").html(msg);
        $("#popup_textarea, #popup_cancel").hide();
        $("#popup_ok").show();
        $("#popup01").show();
        // $("#popup01").fadeIn();
    });

    $('#addurls').click(function () {
        let hd = 'Add one or more urls';
        let msg = 'Copy here one or more urls. Each url should be on a new line.';
        let label = 'Urls';
        $("#popupheader").html(hd);
        $("#popupmessage").html(msg);
        $("#popup_textarea_label").html(label);
        $("#popup_textarea_text").val('');
        $("#popup_ok").val('Okay');
        $("#popup_textarea, #popup_cancel").show();
        $("#popup01").show();
        $("#popup_textarea_text").focus();
    });

    $('#clearurls').click(function () {
        $('#editable').empty();
        localStorage.setItem('selurls', '');
    });

    $('#closepopup01, #popup_cancel').click(function () { //close popup
        $("#popup01").hide();
    });
    $('#popup_ok').click(function () {
        let txt = $('#popup_textarea_text').val();
        if (txt){ //only for 'Add urls'
            // console.log('popup txt: '+txt);
            txt = $.trim(txt);
            var lines = txt.split('\n');
            for (var i = 0; i < lines.length; i++) {
                //check if url is url #####
                if (lines[i].length > 0) {
                    if (isUrl(lines[i])) {
                        addurltolist(lines[i]);
                    } else {
                        alert(lines[i] + ' is not a correct url');
                    }
                }
            }
        }
        $("#popup_textarea_text").val('');
        $("#popup01").hide();
    });

    socket.on('connect', function () {
        console.log('Connected...')
    });
    $('#makebook').click(function () {
        if (validateForm()) {
            var pngUrl = canvas.toDataURL();
            pngUrl = pngUrl.replace(/^data:image\/\w+;base64,/, ""); // strip off the data: to get just the base64-encoded bytes
            $('#log').val('');
            let urls = $('.urls').map(function () {
                return $(this).val();
            }).get();
            let datas = $('.data').map(function () { //tit, des, aut, color-input
                return $(this).val();
            }).get();
            datas.push(pngUrl);
            console.log(datas.length);//5
            datas.unshift(datas.length); // include # of meta fields as first element
            // console.log('datas: ' + datas.toString());
            datas = $.merge(datas, urls);
            // console.log('datas: ' + datas.toString());
            socket.emit('make_book', {
                data: datas.toString()
            });
            window.scrollTo(0, 300);
        }
    });
    socket.on('my_response', function (msg) {
        let val = $('#log').val() + msg.data + '\n';
        $('#log').val(val);
        let $textarea = $('#log');
        $textarea.scrollTop($textarea[0].scrollHeight);
    });
    socket.on('book_finished', function (msg) {
        window.location.href = msg.data //download file
    });
    $('#tit, #des, #aut').keyup(function () {
        drawMeme()
    });
    $("#color-input").on("change",function(){
        drawMeme()
    });
    drawMeme();
});

