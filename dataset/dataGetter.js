var fs = require("fs");
var req = require("superagent");
var pokes = require("./../pokes.json");

function situations(html){
  // Gets a bulk HTML file downloaded from replay.pokemonshowdown.com,
  // parses the log, returns a list of actions (switch, damage, etc).
  function buildActions(file){
    var beginMark = '<script type="text/plain" class="battle-log-data">';
    var beginMark2 = '<script type="text/plain" class="log">';
    var endMark = '</script>';
    var begin = file.indexOf(beginMark);
    if (begin === -1) begin = file.indexOf(beginMark2);
    var end = file.indexOf(endMark, begin);
    if (begin !== -1){
      var log = file.slice(begin + beginMark.length, end);
      var actions = log
        .split("\n")
        .map(function(line){
          return line.split("|").filter(function(word){
            return word !== "";
          });
        })
        .filter(function(line){
          return line.length > 0;
        });
    };
    return actions;
  };

  // Gets a list of actions, returns every turn's state.
  function buildStates(actions){
    function nam(x){
      return x.replace("a:",":").replace("b:",":");
    };
    var states = [];
    var turned = 0;
    var sentPokes = [0, 0];
    var players = {};
    var state = {pokes: {}, turn: 0, winner: 0, move: null};
    for (var i=0; i<actions.length; ++i){
      var act = actions[i];
      switch (act[0]){
        case "start":
        case "turn":
          turned = 1;
        break;
        case "choice":
          if (turned){
            turned = 0;
            state.next = act.slice(1);
            states.push(JSON.parse(JSON.stringify(state)));
            ++state.turn;
            for (var n in state.pokes)
              if (state.pokes[n].active)
                ++state.pokes[n].active;
          };
        break;
        case "switch":
        case "drag":
          var name = nam(act[1]);
          if (!state.pokes[name]){
            var player = name.slice(0,2) === "p1" ? 1 : 2;
            var specie = act[2];
            if (specie.indexOf(",") !== -1)
              specie = specie.slice(0, specie.indexOf(","));
            state.pokes[name] = {
              specie: specie,
              hp: act[3],
              boost: {
                hp: 0,
                atk: 0,
                def: 0,
                spa: 0,
                spd: 0,
                spe: 0
              },
              status: {
                brn: 0,
                psn: 0,
                par: 0,
                frz: 0,
                slp: 0
              },
              mega: 0,
              active: 0,
              player: player,
              partyNum: sentPokes[player-1]++,
            };
          };
          var p = name.slice(0,2);
          for (var n in state.pokes){
            if (n.slice(0,2) === p){
              state.pokes[n].active = 0;
              for (var key in state.pokes[n].boost)
                state.pokes[n].boost[key] = 0;
            };
          };
          state.pokes[name].active = 1;
        break;
        case "-damage":
        case "-heal":
          state.pokes[nam(act[1])].hp = act[2];
        break;
        case "-boost":
          state.pokes[nam(act[1])].boost[act[2]] += Number(act[3]);
        break;
        case "-unboost":
          state.pokes[nam(act[1])].boost[act[2]] -= Number(act[3]);
        break;
        case "-setboost":
          state.pokes[nam(act[1])].boost[act[2]] = Number(act[3]);
        break;
        case "-mega":
          state.pokes[nam(act[1])].mega = 1;
        break;
        case "-status":
          state.pokes[nam(act[1])].status[act[2]] = 1;
        break;
        case "-curestatus":
          state.pokes[nam(act[1])].status[act[2]] = 0;
        break;
        case "player":
          players[act[2]] = Number(act[1][1])-1;
        break;
        case "win":
          state.winner = players[act[1]]+1;
        break;
      };
    };
    states.push(JSON.parse(JSON.stringify(state)));
    return states;
  };

  // Builds situations
  function hp(str){
    if (str === "0 fnt") return 0;
    str = str.replace(/[^\d\/]/g, "");
    var a = str.slice(0, str.indexOf("/"));
    var b = str.slice(str.indexOf("/")+1);
    return Number(a) / Number(b);
  };
  function entry(player){
    return [].concat.call(
      [player.specie],
      [player.active],
      [player.hp],
      player.boost,
      player.status,
      player.party);
  };
  var states = buildStates(buildActions(html));
  var situations = [];
  for (var i=0, l=states.length; i<l; ++i){
    var state = states[i];
    var players = [
      {party: [1,1,1,1,1,1]},
      {party: [1,1,1,1,1,1]}
    ];
    for (var p=0; p<2; ++p){
      var move = state.next[p];
      if (move.slice(0, 7) === "switch ")
        move = move.slice(0, 6);
      if (move.slice(0,4) === "move")
        move = move.slice(5);
      if (move === "s")
        console.log(state.next[p], move);
      players[p].move = move;
    };
    for (var p in state.pokes){
      var poke = state.pokes[p];
      var player = players[poke.player-1];
      if (poke.active){
        player.specie = poke.specie;
        player.hp = hp(poke.hp);
        player.boost = [poke.boost.atk, poke.boost.def, poke.boost.spa, poke.boost.spd, poke.boost.spe];
        player.status = [poke.status.brn, poke.status.psn, poke.status.par, poke.status.frz, poke.status.slp];
        player.active = poke.active;
        player.wins = state.winner === poke.player ? 1 : 0;
      };
      player.party[poke.partyNum] = hp(poke.hp);
    };
    situations.push({
      turn: state.turn,
      players: players
    });
  };
  return situations;
  //console.log(JSON.stringify(situations, null, 2));
};

function getSituations(battle, callback){
  req.get("http://replay.pokemonshowdown.com/"+battle+"#").end(function(err, res){
    try {
      var sit = situations(res.text);
      var ps = 0;
      res.text.match(/pokemonshowdown.com\/users\/(.*?)"/g).map(function(match, p){
        var url = "http://"+match.slice(0,-1);
        req.get(url).end(function(err,res){
          try {
            var elo = Number(res.text.match(/<td>ou<\/td>(.*?)<\/strong>/g)[0].replace(/[^\d]/g,""));
            if (isNaN(elo)) throw "Erro extraindo o ELO de "+url;
            for (var i=0, l=sit.length; i<l; ++i)
              sit[i].players[p].elo = elo;
            if (++ps === 2){
              callback(sit);
              callback = function(){};
            };
          } catch (e){
            callback(null);
            callback = function(){};
          };
        });
      });
      //console.log(JSON.stringify(sit, null, 2));
    } catch(e){
      callback(null);
      callback = function(){};
    };
  });
};

module.exports = {
  situations: situations,
  getSituations: getSituations
};
