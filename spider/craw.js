/*global phantom*/
"use strict";

//相当于 -vvv 模式
var debugMode = false;

//单个请求的最长时间 ms
var singleRequestTimeout = 5000;

// 每隔 N 毫秒检查 dom 是否加载完毕
// 其实基本上都加载完毕了，因为本来就是 phantomjs 的 onLoadFinished 的回调
// 这个值基本等同于页面执行的时间，为了等待 js 执行
var domReadyCheckTime = 200;

//默认ua
var ua = '';

//浏览器宽高
var viewSize = {
    width: 1280,
    height: 1014
};

var customHeaders = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
};

// bug see https://github.com/ariya/phantomjs/issues/10150
console.warn = function () {
    require("system").stderr.write(Array.prototype.join.call(arguments, ' ') + '\n');
};
console.error = function () {
    require("system").stderr.write(Array.prototype.join.call(arguments, ' ') + '\n');
};

phantom.onError = function (msg, trace) {
    var msgStack = ['PHANTOM ERROR: ' + msg  + ' ' + getTimeStamp()];
    if (trace && trace.length) {
        msgStack.push('TRACE:');
        trace.forEach(function (t) {
            msgStack.push(' -> ' + (t.file || t.sourceURL) + ': ' + t.line + (t.function ? ' (in function ' + t.function + ')' : ''));
        });
    }
    console.error(msgStack.join('\n'));
    phantom.exit(1);
};


// PhantomJS WebPage模块
var page = require('webpage').create();

// NodeJS 系统模块
var system = require('system');

// 资源请求并计数
page.onResourceRequested = function (req, net) {
    if (debugMode) {
        console.error('req '+req.id + ' ' + req.url + ' ' + req.method + ' ' + getTimeStamp());
    }
};

// 资源加载完毕
page.onResourceReceived = function (res) {
    // chunk模式的HTTP回包，会多次触发resourceReceived事件，需要判断资源是否已经end
    if (res.stage !== 'end') {
        return;
    }

    if (debugMode) {
        console.error('res ' +res.id + ' ' + res.url + ' ' + res.status  + ' ' + res.redirectURL + ' ' + getTimeStamp());
    }

    // 第一次请求 
    if (res.id === 1) {
        requestHeaderContentType = res.contentType;
        requestHeaderStatus = res.status;

        if (res.redirectURL) {
            requestRedirectUrl = res.redirectURL;
        }
    }

};

// catch error，防止错误直接暴露到页面
page.onError = function (msg, trace) {

    var msgStack = ['ERROR: ' + msg  + ' ' + getTimeStamp()];

    if (trace && trace.length) {
        msgStack.push('TRACE:');
        trace.forEach(function (t) {
            msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function + '")' : ''));
        });
    }

    console.error(msgStack.join('\n'));
};

page.onConsoleMessage = function(msg, lineNum, sourceId) {
   console.error('CONSOLE: ' + msg + ' (from line #' + lineNum + ' in "' + sourceId + '")' + ' ' + getTimeStamp());
};

// 资源加载超时
page.onResourceTimeout = function (request) {
    console.error('Response (#' + request.id + '): ' + request.url + ' timeout ' + JSON.stringify(request) + ' ' + getTimeStamp());
};

// 资源加载失败
page.onResourceError = function (resourceError) {
    console.error('Unable to load resource (#' + resourceError.id + 'URL: ' + resourceError.url + ' )' + ' Error code: ' + resourceError.errorCode + '. Description: ' + resourceError.errorString + ' ' + getTimeStamp());
};

page.onLoadFinished = function(status) {
    if (debugMode) {
        console.error('onLoadFinished: ' + status + ' ' + url  + ' ' + getTimeStamp());
    }
};

page.onLoadStarted = function() {
    if (debugMode) {
        console.error('onLoadStarted: ' + url + ' ' + getTimeStamp());
    }
};

var requestRedirectUrl = '';
var requestHeaderContentType = '';
var requestHeaderStatus = 200;


// 从CLI中获取第二个参数为目标URL
var url = system.args[1];

if (system.args[2]) {
    ua = require('base-64').decode(system.args[2]);
}

// 设置PhantomJS视窗大小
page.viewportSize = viewSize;

ua = ua.replace(/bot/g, '-b-o-t');
ua = ua.replace(/pider/g, '-p-i-d-e-r');

//timeout
page.settings.userAgent = ua + ' ' + 'ServerRenderJavascript';
page.settings.resourceTimeout = singleRequestTimeout;

page.customHeaders = customHeaders;

// 页面 load 完毕，开始处理数据
var capture = function (errCode) {

    var content = page.plainText;

    //对 html ，需要保留标签
    if (requestHeaderContentType.indexOf("html") > -1) {
        content = page.content;
    }

    //对 xml ，需要保留标签
    if (requestHeaderContentType.indexOf("xml") > -1) {
        content = page.content;
    }

    //没有获取到内容时，记录错误，并返回错误
    if (content === '') {
        errCode = 3;
        console.error("Unsupported Type: " + requestHeaderContentType  + ' ' + url + ' ' + getTimeStamp());
    }

    content = requestHeaderStatus + "\n" + requestHeaderContentType + "\n" + requestRedirectUrl + "\n" + content;

    console.log(content);

    // 任务完成，正常退出
    phantom.exit(errCode);
};

// 每 N 毫秒检查一次是否加载完毕
function checkReadyState() {

    setTimeout(function () {
        var readyState = page.evaluate(function () {
            return document.readyState;
        });

        if (debugMode) {
            console.error('readyState: ' + readyState + ' ' + url + ' ' + getTimeStamp());
        }

        if ("complete" === readyState) {
            capture(0);
        } else {
            checkReadyState();
        }
    }, domReadyCheckTime);
}

// 打开页面，回调表示加载完毕 html 时
page.open(url, function (status) {
    if (status !== 'success') {
        phantom.exit(1);
    } else {
        if (debugMode) {
            console.error('onLoadFinished in open Callback: ' + url + ' ' + status + ' ' + getTimeStamp());
        }
        checkReadyState();
    }
});

function getTimeStamp() {
    return  new Date().getTime();
}
