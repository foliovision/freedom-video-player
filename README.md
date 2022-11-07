# Freedom Player

[website](https://foliovision.com) | [demos](https://foliovision.com/player/demos) | [docs](https://foliovision.com/player)

## For the impatient

1. [Download Freedom Player](https://github.com/foliovision/freedom-video-player/releases)
2. Unzip
3. Drop the folder under your server

## Minimal setup

```html
<!DOCTYPE html>

<head>
   <!-- freedomplayer.js -->
   <script type="text/javascript" src="freedomplayer.min.js"></script>

   <!-- player styling -->
   <link rel="stylesheet" type="text/css" href="freedomplayer/skin.css">

</head>

<body>

   <!-- player 1 -->
   <div class="freedomplayer">
      <video src="my-video.mp4"></video>
   </div>

   <!-- player 2 -->
   <div class="freedomplayer">
      <video>
         <source type="video/webm" src="my-video2.webm">
         <source type="video/mp4" src="my-video2.mp4">
      </video>
   </div>

</body>

```

## API Samples

```js
// listen to events on second player
freedomplayer(1).bind("load", function (e, api, video) {

}).bind("pause", function (e, api) {

});

// work with jQuery
$(".freedomplayer").bind("unload", function (e, api) {

});
```

## Reporting bugs

Please read the [contributing guidelines](CONTRIBUTING.md) before reporting issues or submitting patches.

## Running tests

We do automated tests with Continuous Integration on a private server for now. The previous version Flowplayer 7 had  automated testing built-in.

## License

[GPL v3](LICENSE.md)

Copyright (c) 2022 Foliovision s.r.o.
