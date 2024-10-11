freedomplayer(function(player, root) {

  if ( typeof player.conf.logo === 'undefined' ) return;

  var image = document.createElement("img");
  image.src = player.conf.logo;

  var logo = document.createElement("a");
  logo.className = 'fp-logo';
  logo.appendChild(image);

  var fp_player = root.querySelector(".fp-player");

  if( fp_player ) {
    fp_player.appendChild(logo);
  } else {
    root.appendChild(logo);
  }

});