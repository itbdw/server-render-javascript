// ExpressJS调用方式
var express = require('express');
var app = express();
var base64 = require('base-64');

app.enable('trust proxy');

// 引入NodeJS的子进程模块
var child_process = require('child_process');

app.get('/*', function(req, res){

    // 完整URL
    var url = req.protocol + '://'+ req.hostname + req.originalUrl;
    var ua = base64.encode(req.headers['user-agent']);

    // 预渲染后的页面字符串容器
    var content = '';

    // 开启一个phantomjs子进程
    var phantom = child_process.spawn('phantomjs', ['--load-images=false', '--disk-cache=true', '--disk-cache-path=/tmp/phantomjs/cache', '--ignore-ssl-errors=true', '--local-storage-path=/tmp/phantomjs/local', 'craw.js', url, ua]);

    // 设置stdout字符编码
    phantom.stdout.setEncoding('utf8');

    // 监听phantomjs的stdout，并拼接起来
    phantom.stdout.on('data', function(data){
        content += data.toString();
    });

    phantom.stderr.on('data', function(data){
        console.error('stderr:' + url + "\n" + data.toString());
    });

    phantom.on('uncaughtException', function(err) {
        console.error((err && err.stack) ? err.stack : err);
        res.statusCode = 503;
        res.send('Error');
    });

    // 监听子进程退出事件
    phantom.on('exit', function(code){
        switch (code){
            case 1:
                console.log('加载失败: '+url);
                res.statusCode = 502;
                res.send('加载失败');
                break;
            case 2:
                console.log('加载超时: '+ url);
                res.statusCode = 504;
                res.send(content);
                break;
            default:

                var content_split = content.split("\n");

                if (content_split[1] === undefined) {
                    console.error('执行异常，没有获取到状态码: '+ url);
                    res.statusCode = 503;
                    res.send(content);
                    return;
                }

                var status = content_split[0];
                var contentType = content_split[1];

                res.statusCode = status;
                res.header("Content-Type", contentType);

                content_split.shift();
                content_split.shift();

                content = content_split.join("\n");

                res.send(content);
                break;
        }
    });

});

port = process.env.PORT || 3000;

app.listen(port, function () {
    console.log('server-render-javascript app start listening on port ' + port + '!');
});

