var getter = require("./dataGetter.js");
var fs = require("fs");
var req = require("superagent");
var requested = {};
(function get(){
  console.log("Looking for new battles...");
  req.get("http://replay.pokemonshowdown.com/").end(function(err, res){
    try {
      var battles = res.text.match(/ou-\d\d\d\d\d\d\d\d\d/g).filter(function(battle){
        return !fs.existsSync("sits/"+battle+".json") && !requested[battle];
      });
      console.log("Found "+battles.length+" new battles.");
      (function one(){
        if (battles.length === 0)
          setTimeout(get, 15000);
        else {
          var battle = battles.pop();
          requested[battle] = 1;
          console.log("  Getting "+battle);
          getter.getSituations(battle, function(sits){
            if (sits){
              fs.writeFileSync("sits/"+battle+".json", JSON.stringify(sits, null, 2));
              console.log("    SUCCESS ("+sits.length+" sits)");
            } else console.log("    ERROR");
            one();
          });
        };
      })();
    } catch(e){
      //setTimeout(get, 15000);
    };
  });
})();
