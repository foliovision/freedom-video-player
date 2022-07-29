flowplayer(function(player, root) {
  player.on('ready', function() {

    if ( typeof player.conf.logo === 'undefined' ) return;

    if( root.querySelector('fp-logo') ) root.querySelector('fp-logo').remove();

    var logo = document.createElement('a');

    logo.className = 'fp-logo';

    var branding_styles = {
      display: "block",
      position: "absolute",
      left: "16px",
      bottom: "56px",
      zIndex: 99999,
      width: "120px",
      height: "27px",
      backgroundImage: "url(" + player.conf.logo + ")"
    };

    for (var style in branding_styles) branding_styles.hasOwnProperty(style) && (logo.style[style] = branding_styles[style]);

    var fp_player = root.querySelector(".fp-player");

    if( fp_player ) {
      fp_player.appendChild(logo);
    } else {
      root.appendChild(logo);
    }
  });

});