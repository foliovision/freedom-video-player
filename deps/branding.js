freedomplayer(function(player, root) {
  player.on('ready', function() {

    if ( typeof player.conf.logo === 'undefined' ) return;

    if( root.querySelector('fp-logo') ) root.querySelector('fp-logo').remove();

    var logo = document.createElement("a");

    logo.className = 'fp-logo';
    logo.innerHTML = '<img src="'+ player.conf.logo +'">';

    var fp_player = root.querySelector(".fp-player");

    if( fp_player ) {
      fp_player.appendChild(logo);
    } else {
      root.appendChild(logo);
    }
  });

});