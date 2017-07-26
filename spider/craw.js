/*global phantom*/
"use strict";

//单个请求的最长时间 ms
var singleRequestTimeout = 1000;

// 加载完毕后的最大等待时间,即 js 执行时间 ms
var waitExecuteTime = 200;

//前缀
var ua = '';


// bug see https://github.com/ariya/phantomjs/issues/10150
console.warn = function () {
    require("system").stderr.write(Array.prototype.join.call(arguments, ' ') + '\n');
};
console.error = function () {
    require("system").stderr.write(Array.prototype.join.call(arguments, ' ') + '\n');
};


phantom.onError = function (msg, trace) {
    var msgStack = ['PHANTOM ERROR: ' + msg];
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
    // console.error('req '+req.id + ' ' + req.url + ' ' + req.method);

    if (requestRedirectUrl) {
        //capture(0);
    }
    // console.error('real req '+req.id + ' ' + req.url + ' ' + req.method);

};

// 资源加载完毕
page.onResourceReceived = function (res) {
    // console.error('res ' +res.id + ' ' + res.url + ' ' + res.status  + ' ' + res.redirectURL);

    // 第一次请求 
    if (url == res.url) {
        // console.error('real res ' +res.id + ' ' + res.url + ' ' + res.status  + ' ' + res.redirectURL);
        requestHeaderContentType = res.contentType;
        requestHeaderStatus = res.status;

        if (res.redirectURL) {
            requestRedirectUrl = res.redirectURL;

            //capture(0);
        }
    }

    // console.error('real res ' +res.id + ' ' + res.url + ' ' + res.status  + ' ' + res.redirectURL);
};

// catch error，防止错误直接暴露到页面
page.onError = function (msg, trace) {

    var msgStack = ['ERROR: ' + msg];

    if (trace && trace.length) {
        msgStack.push('TRACE:');
        trace.forEach(function (t) {
            msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function + '")' : ''));
        });
    }

    console.error(msgStack.join('\n'));
};

// 资源加载超时
page.onResourceTimeout = function (request) {
    console.error('Response (#' + request.id + '): ' + JSON.stringify(request));
};

// 资源加载失败
page.onResourceError = function (resourceError) {
    console.error('Unable to load resource (#' + resourceError.id + 'URL:' + resourceError.url + ')');
    console.error('Error code: ' + resourceError.errorCode + '. Description: ' + resourceError.errorString);
};

var waitExecuteTimer;

var requestRedirectUrl = '';
var requestHeaderContentType = '';
var requestHeaderStatus = 200;


// 从CLI中获取第二个参数为目标URL
var url = system.args[1];

if (system.args[2]) {
    ua = require('base-64').decode(system.args[2]);
}

// 设置PhantomJS视窗大小
page.viewportSize = {
    width: 1280,
    height: 1014
};

ua = ua.replace(/bot/g, '-b-o-t');
ua = ua.replace(/pider/g, '-p-i-d-e-r');

//timeout
page.settings.userAgent = ua + ' ' + 'ServerRenderJavascript';
page.settings.resourceTimeout = singleRequestTimeout;

page.customHeaders = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

// 获取镜像
var capture = function (errCode) {
    // 外部通过stdout获取页面内容
    // 默认只用原文，因为 phantomjs 会默认给内容加 <html><head> 等标签
    var content = page.plainText;

    //对 html ，需要保留标签
    if (requestHeaderContentType.indexOf("html") > -1) {
        content = page.content;
    }

    //对 xml ，需要保留标签
    if (requestHeaderContentType.indexOf("xml") > -1) {
        content = page.content;
    }

    content = requestHeaderStatus + "\n" + requestHeaderContentType + "\n" + requestRedirectUrl + "\n" + content;

    console.log(content);

    // 清除计时器
    clearTimeout(waitExecuteTimer);

    // 任务完成，正常退出
    phantom.exit(errCode);

};

// 打开页面，回调表示加载完毕 html 时
page.open(url, function (status) {
    if (status !== 'success') {
        phantom.exit(1);
    } else {
        // 当改页面的初始html返回成功后，开启定时器
        // 当到达最大时间的时候，截取那一时刻渲染出来的html
        waitExecuteTimer = setTimeout(function () {
            capture(0);
        }, waitExecuteTime);
    }
});
