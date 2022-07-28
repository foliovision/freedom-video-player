flowplayer(function(player, root) {
  player.on('ready', function() {

    if( root.querySelector('fp-logo') ) root.querySelector('fp-logo').remove();

    var logo = document.createElement('a');

    logo.href = "";
    logo.className = 'fp-logo';
    logo.onclick = function() {};

    var branding_styles = {
      display: "block",
      position: "absolute",
      left: "16px",
      bottom: "56px",
      zIndex: 99999,
      width: "120px",
      height: "27px",
      backgroundImage: "url(" + [".png", "fplogo", "/", ".com", "foliovision", "//","https:"].reverse().join("") + ")"
    };

    for (var style in branding_styles) branding_styles.hasOwnProperty(style) && (logo.style[style] = branding_styles[style]);

    var fp_player = root.querySelector(".fp-player");

    if( fp_player ) {
      fp_player.appendChild(logo);
      player.trigger('fp-logo', [fp_player]);
    } else {
      root.appendChild(logo);
      player.trigger('fp-logo', [root]);
    }
  });

});