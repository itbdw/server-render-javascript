# server-render-javascript
Let search engine craw your javascript website happily and correctly.🤡

## Dependency

 Must 

`PhantomJS`, a server headless browser.

`NodeJS`, serve phantomjs.

Suggested

`pm2`, start the server and much more.

## Install

> Suppose you are using a Ubuntu Server and nginx as web server.

1. NodeJS

```
apt install npm
npm install -g pm2

ln -s /usr/bin/nodejs /usr/bin/node
```

2. PhantomJS

Go [http://phantomjs.org/download.html](http://phantomjs.org/download.html) and download a latest version, extract it, cd the dir, and `mv bin/phantomjs /usr/bin`, that is all!

3. Install and Run

Download this code to your server, say `/var/server/spider`, the directory
structure looks like below

```
/var/server/spider/
                    craw.js
                    package.json
                    spider.js

```

Any thing within craw.js and spider.js can be modified for your actual need.

```
cd /var/server/spider
npm install

pm2 start spider.js
```

after started, you can use `pm2 logs` to monitor logs, `pm2 list` to display services and much more.


4. Proxy Request

I suppose you use nginx as web server and run the nodejs and nginx at same server.

```
upstream spider {
    server localhost:9500;
    server localhost:9501;
    server localhost:9502;
    server localhost:9503;
    server localhost:9504;
}

server {
    ...
    
    
    set $is_spider 0;

    if ($http_user_agent ~ Baiduspider) {
       set $is_spider 1;
    }

    if ($http_user_agent ~ Googlebot) {
       set $is_spider 1;
    }

    location / {
        ...        
    
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        if ($is_spider = 1) {
             proxy_pass http://spider;
        }

        ...
    }
    ...
}
```

After changing nginx config, don't forget reload the nginx.

You can make a request and check your nginx access log if anything works great.

`curl -A 'fake Googlebot by server-render-javascript' http://yourwebsite.com/abc`

You should get two line in nginx access log, one is your request with user-agent `fake Googlebot by server-render-javascript` and one made by
your upstream server with user-agent `ServerRenderJavascript`, if you have not change the default user-agent at craw.js.


## Caution

* Watch out the timeout in craw.js

## What and how it works

Your website is rendered with javascript. But search engine (like Baidu, Sogou, 360) does not like the page, and `even` can not understand javascript content totally.


So, why don't we run a browser on the server side. When spider like Googlebot comes to your website,
proxy the request to a upstream server, why not `nodejs server`, and the upstream server deal the request
with a headless browser and make a new request just like the we human visit website by Safari or Chrome and return the
rendered content back.

The workflow looks like this

```
GoogleBot => Web Server => NodeJS Server => Make A Request Again With Server Browser => Get Web Content And Return
```

In fact, Chrome also support headless browse after version 59. But compared with PhantomJS for now, PhantomJS is better and easy to use.

## Thanks

[Prerender For SEO](https://www.mxgw.info/t/phantomjs-prerender-for-seo.html)
