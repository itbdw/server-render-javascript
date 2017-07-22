// ExpressJS调用方式
var express = require('express');
var app = express();

// 引入NodeJS的子进程模块
var child_process = require('child_process');

app.get('/*', function(req, res){

    // 完整URL
    var url = req.protocol + '://'+ req.hostname + req.originalUrl;

    // todo 硬编码，如果是 https 的需要设置这个，否则使用上面的即可
    // var url = 'https' + '://'+ req.hostname + req.originalUrl;

    // 预渲染后的页面字符串容器
    var content = '';

    // 开启一个phantomjs子进程
    var phantom = child_process.spawn('phantomjs', ['--load-images=false', '--disk-cache=true', '--disk-cache-path=/tmp/phantomjs/cache', '--ignore-ssl-errors=true', '--local-storage-path=/tmp/phantomjs/local', 'craw.js', url]);

    // 设置stdout字符编码
    phantom.stdout.setEncoding('utf8');

    // 监听phantomjs的stdout，并拼接起来
    phantom.stdout.on('data', function(data){
        content += data.toString();
    });


    // 监听子进程退出事件
    phantom.on('exit', function(code){
        switch (code){
            case 1:
                console.log('加载失败: '+url);
                res.setHeader(502);
                res.send('加载失败');
                break;
            case 2:
                console.log('加载超时: '+ url);
                res.writeHead(504);
                res.send(content);
                break;
            default:

                var content_type = content.split("\n")[0];
                res.header("Content-Type", content_type);

                content = content.replace(content_type + "\n", "");

                res.send(content);
                break;
        }
    });

});

app.listen(9001);

