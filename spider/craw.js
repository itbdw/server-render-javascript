/*global phantom*/
"use strict";

// 单个资源等待时间，避免资源加载后还需要加载其他资源
var resourceWait = 1000;
var resourceWaitTimer;

// 最大等待时间
var maxWait = 500;
var maxWaitTimer;

// 资源计数
var resourceCount = 0;

// 请求计数，单纯为了记录 header
var requestCount = 0;
var requestHeaderContentType = '';
var requestHeaderStatus = 200;

// PhantomJS WebPage模块
var page = require('webpage').create();
var base64 = require('base-64');

// NodeJS 系统模块
var system = require('system');

// 从CLI中获取第二个参数为目标URL
var url = system.args[1];
var ua = base64.decode(system.args[2]);

// 设置PhantomJS视窗大小
page.viewportSize = {
    width: 1280,
    height: 1014
};

ua = ua.replace(/bot/g, '-b-o-t');
ua = ua.replace(/pider/g, '-p-i-d-e-r');

//timeout
page.settings.userAgent = ua + ' ' + 'ServerRenderJavascript';
page.settings.resourceTimeout = 5000;

page.customHeaders = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

page.onInitialized = function() {
    page.customHeaders = {};
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

    content =  requestHeaderStatus + "\n" + requestHeaderContentType + "\n" + content;
    console.log(content);

    // 清除计时器
    clearTimeout(maxWaitTimer);

    // 任务完成，正常退出
    phantom.exit(errCode);

};

// 资源请求并计数
page.onResourceRequested = function (req) {
    resourceCount++;
    clearTimeout(resourceWaitTimer);
};

// 资源加载完毕
page.onResourceReceived = function (res) {

    // chunk模式的HTTP回包，会多次触发resourceReceived事件，需要判断资源是否已经end
    if (res.stage !== 'end') {
        return;
    }

    resourceCount--;

    if (resourceCount === 0) {

        // 当页面中全部资源都加载完毕后，截取当前渲染出来的html
        // 由于onResourceReceived在资源加载完毕就立即被调用了，我们需要给一些时间让JS跑解析任务
        resourceWaitTimer = setTimeout(capture, resourceWait);
    }

    requestCount++;

    if (requestCount === 1) {
        requestHeaderContentType = res.contentType;
        requestHeaderStatus = res.status;
    }

};

// catch error，防止失败错误直接暴露到页面
page.onError = function (res) {

};

// 资源加载超时
page.onResourceTimeout = function (req) {
    resouceCount--;
};

// 资源加载失败
page.onResourceError = function (err) {
    resourceCount--;
};

// 打开页面
page.open(url, function (status) {
    if (status !== 'success') {
        phantom.exit(1);
    } else {
        // 当改页面的初始html返回成功后，开启定时器
        // 当到达最大时间的时候，截取那一时刻渲染出来的html
        maxWaitTimer = setTimeout(function () {
            capture(0);
        }, maxWait);
    }
});
